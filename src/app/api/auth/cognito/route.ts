/* eslint-disable */
import { NextRequest, NextResponse } from "next/server";
import {
  CognitoIdentityProviderClient,
  RespondToAuthChallengeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ChallengeNameType,
  ListUsersCommand,
  ListGroupsCommand,
  // AdminSetUserPasswordCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminCreateUserCommand,
  // AdminAddUserToGroupCommand,
  AdminListUserAuthEventsCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import * as crypto from 'crypto';

import awsConfig from "../../../../../amplify_outputs.json";
const cognitoClientId = awsConfig?.custom?.userPoolClientId || process.env.COGNITO_CLIENT_ID || "";
const cognitoClientSecret = awsConfig?.custom?.token || process.env.COGNITO_CLIENT_SECRET || "";
const cognitoUserPoolId = awsConfig?.auth?.user_pool_id || process.env.COGNITO_USER_POOL_ID || "";
const cognitoRegion = awsConfig?.auth?.aws_region || 'us-east-1';

const cognito = new CognitoIdentityProviderClient({
    region: cognitoRegion,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.AWS_SESSION_TOKEN || '',
      }
});

function getSecretHash(username: string, clientId: string, clientSecret: string): string {
  const message = `${username}${clientId}`;
  const dig = crypto.createHmac('sha256', clientSecret).update(message).digest('base64');
  return dig;
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const method = params.get("method");
  const username = params.get("username");

  switch (method) {
    case 'list_users':
      const listUsersCommand = new ListUsersCommand({
        UserPoolId: cognitoUserPoolId || '',
        Limit: 60,
      });
      try {
        let users = [];
        let response = await cognito.send(listUsersCommand);


        users.push(...response.Users as any);
        while (response.PaginationToken) {
          const nextListUsersCommand = new ListUsersCommand({
            UserPoolId: cognitoUserPoolId || '',
            Limit: 60,
            PaginationToken: response.PaginationToken,
          });
          response = await cognito.send(nextListUsersCommand);
          users.push(...response.Users as any);
        }

        return NextResponse.json({ status: "OK", users: users });
      } catch (error) {
        return NextResponse.json({ error: true, message: (error as any).message }, { status: 400 });
      }
    case 'list_groups':
      const listGroupsCommand = new ListGroupsCommand({ UserPoolId: cognitoUserPoolId || '', Limit: 60, });
      try {
        const response = await cognito.send(listGroupsCommand);
        return NextResponse.json({ status: "OK", groups: response.Groups });
      } catch (error) {
        return NextResponse.json({ error: true, message: (error as any).message }, { status: 400 });
      }
    case 'list_auth_events':
      const listAuthEventsCommand = new AdminListUserAuthEventsCommand({
        UserPoolId: cognitoUserPoolId || '',
        Username: username || '',
        MaxResults: 20,
      });
      try {
        const response = await cognito.send(listAuthEventsCommand);
        // return only CreationDate, EventResponse, and EventType
        const events = response?.AuthEvents?.map((event: any) => {
          return {
            CreationDate: event.CreationDate,
            EventResponse: event.EventResponse,
            EventType: event.EventType,
          };
        });

        return NextResponse.json({ status: "OK", events: events });
      } catch (error) {
        return NextResponse.json({ error: true, message: (error as any).message }, { status: 400 });
      }
    // case 'reset_password':
    //   const pwd = params.get("pwd");

    //   const resetCommand = new AdminSetUserPasswordCommand({
    //     UserPoolId: cognitoUserPoolId || '',
    //     Username: username || '',
    //     Password: pwd,
    //     Permanent: false,
    //   });
    //   try {
    //     const response = await cognito.send(resetCommand);
    //     console.log('Password reset:', response);

    //     return NextResponse.json({ status: "OK" });
    //   } catch (error) {
    //     return NextResponse.json({ error: true, message: (error as any).message }, { status: 400 });
    //   }
    case 'toggle_disable_enable':
      const isDisable = params.get("disable") === 'true';

      const toggleCommand = isDisable ? new AdminDisableUserCommand({
        UserPoolId: cognitoUserPoolId || '',
        Username: username || '',
      }) : new AdminEnableUserCommand({
        UserPoolId: cognitoUserPoolId || '',
        Username: username || '',
      });
      try {
        await cognito.send(toggleCommand);
        return NextResponse.json({ status: "OK" });
      } catch (error) {
        return NextResponse.json({ error: true, message: (error as any).message }, { status: 400 });
      }
    case 'create_user':
      const email = params.get("email");
      const name = params.get("name");
      const password = params.get("password");
      //const group = params.get("group");
      const orgName = params.get("orgName");
      const userType = params.get("userType");

      if (!username || !email || !name || !password || !orgName || !userType) {
        return NextResponse.json({ error: true, message: 'Missing required fields' }, { status: 400 });
      }

      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: cognitoUserPoolId || '',
        Username: username,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'name', Value: name },
          { Name: 'custom:org_name', Value: orgName || '' },
          { Name: 'custom:user_type', Value: userType || '' },
          { Name: "email_verified", Value: "true" },
        ],
        TemporaryPassword: password || '',
        "DesiredDeliveryMediums": [],
        "MessageAction": "SUPPRESS",
      });
      try {
        const response = await cognito.send(createUserCommand);

        let cognito_user_id = '';
        response?.User?.Attributes?.forEach((attr: any) => {
          if (attr.Name === 'sub') {
            console.log('sub:', attr.Value);
            cognito_user_id = attr.Value;
          }
        });

        // add user to group
        // const addUserToGroupCommand = new AdminAddUserToGroupCommand({
        //   UserPoolId: cognitoUserPoolId || '',
        //   Username: username || '',
        //   GroupName: group || '',
        // });
        // await cognito.send(addUserToGroupCommand);

        return NextResponse.json({ status: "OK", user: { Username: username, CognitoUserId: cognito_user_id } });
      } catch (error) {
        return NextResponse.json({ error: true, message: (error as any).message }, { status: 400 });
      }
    default:
      break;
  }

  return NextResponse.json({ status: "OK" });
}

export async function POST(request: NextRequest) {
  const res = await request.json();

  const method = res.method as string;
  const username = res.username as string;

  switch (method) {
    case 'forgot_password':
      const command = new ForgotPasswordCommand({
        ClientId: cognitoClientId || '',
        Username: username,
        SecretHash: getSecretHash(username, cognitoClientId || '', cognitoClientSecret || ''),
      });
      try {
        const response = await cognito.send(command);
        console.log('Forgot Password initiated:', response);
        return NextResponse.json({ status: "OK" });
      } catch (error) {
        console.log('Error initiating Forgot Password:', error);
        return NextResponse.json({ error: true, message: (error as any).message }, { status: 400 });
      }
    case 'verify_reset_code':
      const code = res.code as string;
      const new_password = res.new_password as string;

      const confirmCommand = new ConfirmForgotPasswordCommand({
        ClientId: cognitoClientId || '',
        Username: username,
        SecretHash: getSecretHash(username, cognitoClientId || '', cognitoClientSecret || ''),
        ConfirmationCode: code,
        Password: new_password,
      });

      try {
        const confirmResponse = await cognito.send(confirmCommand);
        console.log('Password reset confirmed:', confirmResponse);
        return NextResponse.json({ status: "OK" });
      } catch (error) {
        console.log('Error confirming password reset:', error);
        return NextResponse.json({ error: true, message: (error as any).message }, { status: 400 });
      }
    case 'set_password':
      const password = res.password as string;
      const session = res.session as string;

      const params = {
        ChallengeName: ChallengeNameType.NEW_PASSWORD_REQUIRED,
        ClientId: cognitoClientId || '',
        UserPoolId: cognitoUserPoolId || '',
        ChallengeResponses: {
          USERNAME: username,
          NEW_PASSWORD: password,
          SECRET_HASH: getSecretHash(username, cognitoClientId || '', cognitoClientSecret || ''),
        },
        Session: session,
      };

      try {
        const authResponse = await cognito.send(new RespondToAuthChallengeCommand(params));
        console.log(authResponse);
        return NextResponse.json({ status: "OK" });
      } catch (error: any) {
        console.log(error.message);
        console.log("set new password error:", error);
        return NextResponse.json({ error: true, message: error.message }, { status: 400 });
      }
    default:
      break;
  }
}