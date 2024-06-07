import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Injectable } from '@nestjs/common';
import { createWriteStream, readFileSync } from 'fs';
import { join } from 'path';
import {
  AnswerOption,
  GenerateContentResponse,
  GenerateContentV2Content,
  GeneratedContent,
  GeneratedContentData,
} from './interfaces';
import {
  CONTINUE_CONVERSATION_MUTATION,
  START_CONVERSATION_MUTATION,
  USER_INTERACTION_HISTORY,
} from './mutations';
import * as ExcelJS from 'exceljs';

const USER_MESSAGES: string[] = [
  'Can you assist me in solving this?',
  'Could you guide me through this math problem to find the correct answer?',
  'I need help understanding this math question, can you explain it?',
  'What steps should I follow to solve this math problem?',
  'Can you break down this math problem for me?',
  "I'm stuck on this math question, can you help?",
  'Could you provide a detailed explanation for this math problem?',
  'What is the best approach to solve this math question?',
  'Can you walk me through the solution to this math problem?',
  'How do I find the correct answer to this math question?',
  'What is correct answer to this question?',
  'Suggest please correct answer to this question',
];

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}

  async start(): Promise<void> {
    const generatedContentPath: string = join(
      __dirname,
      '../scripts/generated-content.json',
    );
    const generatedContentList: GeneratedContent[] = JSON.parse(
      readFileSync(generatedContentPath, 'utf8'),
    );
    for (let i = 0; i < generatedContentList.length; i++) {
      const generatedContent: GeneratedContent = generatedContentList[i];
      const generatedContentData: GeneratedContentData = JSON.parse(
        generatedContent.content,
      );
      const graphqlUrl: string = process.env.GRAPHQL_URL;
      const graphqlIdToken: string = process.env.GRAPHQL_ID_TOKEN;
      const includeUserInteractionHistory: boolean = Math.random() > 0.5;
      let userInteractionHistory: string = '';
      let selectedOption: AnswerOption | undefined;
      if (includeUserInteractionHistory) {
        selectedOption = generatedContentData.answer_options.find(
          (answerOption: AnswerOption) => !answerOption.correct,
        ) as AnswerOption;
        userInteractionHistory = USER_INTERACTION_HISTORY.replace(
          '{{selectedOption}}',
          selectedOption.answer,
        );
      }
      const initialResponse: string = await this.startConversation(
        generatedContent,
        userInteractionHistory,
        graphqlUrl,
        graphqlIdToken,
      );
      const userMessage: string =
        USER_MESSAGES[Math.floor(Math.random() * USER_MESSAGES.length)];
      const secondResponse: string = await this.continueConversation(
        generatedContent,
        userInteractionHistory,
        userMessage,
        graphqlUrl,
        graphqlIdToken,
      );
      const headers: string[] = [
        'generatedContentId',
        'generatedContent',
        'selectedOption',
        'initialResponse',
        'userMessage',
        'secondResponse',
      ];
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Responses');
      headers.forEach((header, index) => {
        worksheet.getCell(1, index + 1).value = header;
      });
      const rowValues = [
        generatedContent.id,
        JSON.stringify(generatedContent, null, 2),
        selectedOption ? selectedOption.answer : '-',
        initialResponse,
        userMessage,
        secondResponse,
      ];
      worksheet.addRow(rowValues);
      await workbook.xlsx.writeFile('output.xlsx');
    }
  }

  private async startConversation(
    generatedContent: GeneratedContent,
    userInteractionHistory: string,
    graphqlUrl: string,
    graphqlIdToken: string,
  ): Promise<string> {
    let graphqlQuery: string = START_CONVERSATION_MUTATION;
    graphqlQuery = graphqlQuery.replace(
      '{{generatedContentId}}',
      generatedContent.id,
    );
    graphqlQuery = graphqlQuery.replace(
      '{{userInteractionHistory}}',
      userInteractionHistory,
    );
    const response: AxiosResponse<GenerateContentResponse> =
      await this.httpService
        .post(
          graphqlUrl,
          { query: graphqlQuery },
          { headers: { 'x-api-key': graphqlIdToken } },
        )
        .toPromise();

    const responseContent: GenerateContentV2Content = JSON.parse(
      response.data.data.generateContentV2.content,
    );
    return responseContent.figureResponse.content;
  }

  private async continueConversation(
    generatedContent: GeneratedContent,
    userInteractionHistory: string,
    userMessage: string,
    graphqlUrl: string,
    graphqlIdToken: string,
  ): Promise<string> {
    let graphqlQuery: string = CONTINUE_CONVERSATION_MUTATION;
    graphqlQuery = graphqlQuery
      .replace('{{generatedContentId}}', generatedContent.id)
      .replace('{{userMessage}}', userMessage);
    graphqlQuery = graphqlQuery.replace(
      '{{userInteractionHistory}}',
      userInteractionHistory,
    );
    const response: AxiosResponse<GenerateContentResponse> =
      await this.httpService
        .post(
          graphqlUrl,
          { query: graphqlQuery },
          { headers: { 'x-api-key': graphqlIdToken } },
        )
        .toPromise();

    const responseContent: GenerateContentV2Content = JSON.parse(
      response.data.data.generateContentV2.content,
    );
    return responseContent.figureResponse.content;
  }
}
