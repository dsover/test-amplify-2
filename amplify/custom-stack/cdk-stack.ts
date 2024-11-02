import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CfnUserPoolClient, CfnUserPoolGroup } from "aws-cdk-lib/aws-cognito";
// import { Lazy } from "aws-cdk-lib";
// import * as fs from "fs";
// import * as path from "path";
interface ModifyAuthStackProps extends cdk.StackProps {
    userPoolId: string;
}

export class ModifyAuthStack extends Construct {
    public readonly userPoolClient: CfnUserPoolClient;
    constructor(scope: Construct, id: string, props: ModifyAuthStackProps) {
        super(scope, id);
        console.log('props', props);
        const userPoolId = props.userPoolId;
        // Use Lazy.string to resolve userPoolId lazily at deploy-time
        // const userPoolId = Lazy.string({
        //     produce: () => {
        //         // Read the amplify-meta.json file to get the User Pool ID
        //         const amplifyMeta = JSON.parse(
        //             readFileSync(
        //                 path.resolve(
        //                     import.meta.dirname,
        //                     "../../amplify_outputs.json"
        //                 ),
        //                 "utf8"
        //             )
        //         );
        //         return amplifyMeta.auth.user_pool_id;
        //     },
        // });
        // const amplifyMeta = JSON.parse(
        //     fs.readFileSync(path.resolve(__dirname, "../../amplify_outputs.json"), "utf8")
        // );
        // console.log('amplifyMeta', amplifyMeta);
        // const appUrl = amplifyMeta['main'].hosting.url; 

        // Modify the User Pool Client with callback URLs
        this.userPoolClient = new CfnUserPoolClient(this, "UserPoolClient", {
            userPoolId: userPoolId, // Use the User Pool ID from Amplify
            generateSecret: true,
            callbackUrLs: [
                "https://main.d2glgywy30hn9v.amplifyapp.com/api/auth/callback/cognito",
                "http://localhost:3000/api/auth/callback/cognito",
                "https://yourproductiondomain.com/api/auth/callback/cognito",
            ],
            logoutUrLs: [
                "http://localhost:3000",
                "https://yourproductiondomain.com",
            ],
            allowedOAuthFlows: ["code"],
            allowedOAuthScopes: ["openid", "email", "profile"],
            allowedOAuthFlowsUserPoolClient: true,
            explicitAuthFlows: [
                "ALLOW_USER_PASSWORD_AUTH",
                "ALLOW_USER_SRP_AUTH",
                "ALLOW_REFRESH_TOKEN_AUTH",
                "ALLOW_CUSTOM_AUTH",
            ],
        });
        new CfnUserPoolGroup(this, "AdminsGroup", {
            userPoolId: userPoolId,
            description: "Admins group",
            precedence: 1,
            groupName: "Admins",
        });
    }
}