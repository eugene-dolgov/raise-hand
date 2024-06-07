import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError, AxiosResponse } from 'axios';
import * as ExcelJS from 'exceljs';
import { readFileSync } from 'fs';
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
    const headers: string[] = [
      'grade',
      'standard',
      'generatedContentId',
      'generatedContent',
      'selectedOption',
      'initialResponse',
      'userMessage',
      'secondResponse',
    ];
    let workbook = new ExcelJS.Workbook();
    let worksheet: ExcelJS.Worksheet;
    try {
      workbook = await workbook.xlsx.readFile('output.xlsx');
      worksheet = workbook.getWorksheet('Responses');
    } catch (error) {
      worksheet = workbook.addWorksheet('Responses');
      headers.forEach((header, index) => {
        worksheet.getCell(1, index + 1).value = header;
      });
    }
    for (let i = 0; i < generatedContentList.length; i++) {
      const generatedContent: GeneratedContent = generatedContentList[i];
      const gradeMatch: RegExpMatchArray | null = generatedContent.standard.match(/(\d+)/);
      const gradeNumber: string = gradeMatch ? gradeMatch[0] : 'Unknown';
      const row = worksheet.getRow(i + 2);
      const idCell = row.getCell(3);
      const secondResponseCell = row.getCell(8);
      const rowExists: boolean = idCell.value === generatedContent.id && !!secondResponseCell.value;
      if (rowExists) {
        continue;
      }
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
      const rowValues = [
        gradeNumber,
        generatedContent.standard,
        generatedContent.id,
        JSON.stringify(generatedContentData, null, 2),
        selectedOption ? `${selectedOption.id}) ${selectedOption.answer}` : '-',
        initialResponse,
        userMessage,
        secondResponse,
      ];
      worksheet.insertRow(i + 2, rowValues);
      await workbook.xlsx.writeFile('output.xlsx');
      console.log(`Processed ${i + 1} / ${generatedContentList.length}`);
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
    return this.request(graphqlUrl, graphqlIdToken, graphqlQuery);
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
    return this.request(graphqlUrl, graphqlIdToken, graphqlQuery);
  }

  private async request(graphqlUrl: string, graphqlIdToken: string, graphqlQuery: string): Promise<string> {
    try {
      const response: AxiosResponse<GenerateContentResponse> =
        await this.httpService
          .post(
            graphqlUrl,
            { query: graphqlQuery },
            { headers: { 'Authorization': graphqlIdToken } },
          )
          .toPromise();
      
      if (response.data.errors) {
        throw response.data.errors;
      }

      const responseContent: GenerateContentV2Content = JSON.parse(
        response.data.data.generateContentV2.content,
      );
      return responseContent.figureResponse.content;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(error.response?.data);
      } else {
        console.error(error);
      }
      throw error;
    }
  }
}
