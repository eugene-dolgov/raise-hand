import { timestamp } from "rxjs";

export interface GenerateContentResponse {
  data: GenerateContentResponseData;
  errors?: unknown[];
}

export interface GenerateContentResponseData {
  generateContentV2: GenerateContentV2;
}

export interface GenerateContentV2 {
  attributes: Attribute[];
  extendedAttributes: ExtendedAttribute[];
  generatedContentId: string;
  contentTypeName: string;
  contentTypeId: string;
  content: string;
}

export interface Attribute {
  attributeName: string;
  attributeValue: string;
}

export interface ExtendedAttribute {
  platformId: string;
  value: string;
};

export interface GenerateContentV2Content {
  userMessage: {
    content: string;
    timestamp: string;
  };
  figureResponse: {
    content: string;
    timestamp: string;
  };
}
