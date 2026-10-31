// Provider schema controls shape only. Character caps stay in local validation.
export const DRAFT_SCHEMA = {type:"object", additionalProperties:false, required:["subject","body"], properties:{subject:{type:"string",minLength:1},body:{type:"string",minLength:1}}};
