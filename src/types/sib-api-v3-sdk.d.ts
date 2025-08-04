declare module 'sib-api-v3-sdk' {
    export class TransactionalEmailsApi {
        sendTransacEmail(data: any): Promise<any>;
    }

    
    export const ApiClient: {
        instance: {
            authentications: {
                [key: string]: {
                    apiKey: string;
                };
            };
        };
    };
}
