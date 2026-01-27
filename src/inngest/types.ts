import { EventSchemas } from "inngest";

type BatchCreatedEvent = {
    data: {
        batchId: string;
        validKeys: string[];
        projectId?: string;
        strictMode: boolean;
        useQidOnly?: boolean;
    };
};

export const schemas = new EventSchemas().fromRecord<{
    "batch/created": BatchCreatedEvent;
}>();
