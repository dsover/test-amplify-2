/* eslint-disable */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";
import { Buffer } from "buffer";
import * as crypto from "crypto";
import awsConfig from "../../../amplify_outputs.json";
const cognitoClientId = awsConfig?.custom?.userPoolClientId || process.env.COGNITO_CLIENT_ID || "";
const cognitoClientSecret = awsConfig?.custom?.token || process.env.COGNITO_CLIENT_SECRET || "";
const cognitoRegion = awsConfig?.auth?.aws_region || 'us-east-1';

const cognito = new CognitoIdentityProviderClient({
    region: cognitoRegion,
    //   region: process.env.REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.AWS_SESSION_TOKEN || '',
      }
});

console.log({
    cognitoClientId,
    cognitoClientSecret,
})

function getSecretHash(
    username: string,
    clientId: string,
    clientSecret: string
): string {
    console.log({
        where: "getSecretHash",
        username,
        clientId,
        clientSecret,
    })
    const message = `${username}${clientId}`;
    const dig = crypto
        .createHmac("sha256", clientSecret)
        .update(message)
        .digest("base64");
    return dig;
}

function getCognitoAttribute(idToken: string, attributeName: string): string {
    const payload = idToken.split(".")[1];
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    const attribute = JSON.parse(decoded)[attributeName];

    if (!attribute) {
        return "";
    }

    return attribute;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, req): Promise<any> {
                console.log(credentials)
                if (typeof credentials !== "undefined") {
                    const params = {
                        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
                        ClientId: cognitoClientId,
                        AuthParameters: {
                            USERNAME: credentials.username,
                            PASSWORD: credentials.password,
                            SECRET_HASH: getSecretHash(
                                credentials.username,
                                cognitoClientId,
                                cognitoClientSecret
                            ),
                        },
                    };

                    let authResponse: any = null;
                    try {
                        authResponse = await cognito.send(
                            new InitiateAuthCommand(params)
                        );
                    } catch (error) {
                        throw new Error(
                            JSON.stringify({
                                code: "AUTH_FAILED",
                            })
                        );
                    }

                    console.log(authResponse);

                    if (authResponse.ChallengeName == "NEW_PASSWORD_REQUIRED") {
                        throw new Error(
                            JSON.stringify({
                                code: "NEW_PASSWORD_REQUIRED",
                                session: authResponse.Session,
                            })
                        );
                    }

                    if (
                        !authResponse.AuthenticationResult ||
                        !authResponse.AuthenticationResult.IdToken
                    ) {
                        throw new Error(
                            JSON.stringify({
                                code: "AUTH_FAILED",
                            })
                        );
                    }

                    const cognito_user_id = getCognitoAttribute(
                        authResponse.AuthenticationResult.IdToken,
                        "sub"
                    );

                    const user = {
                        name: getCognitoAttribute(
                            authResponse.AuthenticationResult.IdToken,
                            "cognito:username"
                        ),
                        email: getCognitoAttribute(
                            authResponse.AuthenticationResult.IdToken,
                            "email"
                        ),
                        groups: getCognitoAttribute(
                            authResponse.AuthenticationResult.IdToken,
                            "cognito:groups"
                        ),
                        org_name: getCognitoAttribute(
                            authResponse.AuthenticationResult.IdToken,
                            "custom:org_name"
                        ),
                        user_type: getCognitoAttribute(
                            authResponse.AuthenticationResult.IdToken,
                            "custom:user_type"
                        ),
                    };

                    return user;
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: process.env.ENV == "prod" ? 12 * 60 * 60 : 90 * 24 * 60 * 60, // sessions expire after 12 hours in prod, otherwise 90 days
    },
      secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async session({ session, token, user }) {
            let customSession: any = session;
            customSession.user = {
                ...customSession.user,
                ...token,
                admin: token.user_type === "admin",
            };

            return customSession;
        },
        async jwt({ token, user }) {
            if (user) {
                return {
                    ...token,
                    ...user,
                };
            }
            return token;
        },
    },
    pages: {
        signIn: "/login",
        signOut: "/auth/signout",
        error: "/auth/error",
        verifyRequest: "/auth/verify-request",
        newUser: "/auth/new-user",
    },
};