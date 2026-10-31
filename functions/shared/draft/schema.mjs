// Provider schema controls shape only. Character caps stay in local validation.
export const DRAFT_SCHEMA = {type:"object", additionalProperties:false, required:["subject","summary","source","checks"], properties:{subject:{type:"string",minLength:1},summary:{type:"string",minLength:1},source:{type:"string",minLength:1},checks:{type:"string",minLength:1}}};
