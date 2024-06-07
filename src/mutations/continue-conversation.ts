export const CONTINUE_CONVERSATION_MUTATION = `mutation ChatWithFigure {
  generateContentV2(
    input: {
      attributes: [
        { attributeName: "userMessage", attributeValue: "{{userMessage}}" },
        { attributeName: "generatedContentId", attributeValue: "{{generatedContentId}}"}{{userInteractionHistory}}
      ]
      extendedAttributes: [{ platformId: "d7ff5012-d689-4a84-8aa6-012b63fa0783" }]
      subject: "Math"
      isSyncGeneration: true,
      contentTypeId: "DMs from the Dead v2 - Text Message"
      contentGeneratorId: "Tutor Conversation - Text Message - Continuing"
    }
  ) {
    attributes {
      attributeName
      attributeValue
    }
    extendedAttributes {
      platformId
      value
    }
    generatedContentId
    contentTypeName
    contentTypeId
    content
  }
}`;