export const CONTINUE_CONVERSATION_MUTATION = `mutation ChatWithFigure {
  generateContentV2(
    input: {
      attributes: [
        { attributeName: "userMessage", attributeValue: "{{userMessage}}" },
        { attributeName: "generatedContentId", attributeValue: "{{generatedContentId}}"}{{userInteractionHistory}}
      ]
      extendedAttributes: [{ platformId: "d7ff5012-d689-4a84-8aa6-012b63fa0783" }]
      subject: "Math"
      course: "{{course}}"
      domainId: "{{domainId}}"
      grade: "{{grade}}"
      standardId: "{{standardId}}"
      isSyncGeneration: true,
      contentTypeId: "DMs from the Dead v2 - Text Message"
      contentGeneratorId: "Tutor Conversation - Text Message - Continuing"
    }
  ) {
    content
  }
}`;
