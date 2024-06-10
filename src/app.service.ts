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
  SavedGeneratedContent,
  SavedGeneratedContentContext,
  SavedGeneratedContentData,
} from './interfaces';
import {
  CONTINUE_CONVERSATION_MUTATION,
  START_CONVERSATION_MUTATION,
  USER_INTERACTION_HISTORY,
} from './mutations';

const CHUNK_SIZE = 20;

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
    const generatedContentList: SavedGeneratedContent[] = JSON.parse(
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
    const generatedContentMap: Map<number, SavedGeneratedContent> = new Map();
    generatedContentList.forEach(
      (generatedContent: SavedGeneratedContent, index: number) => {
        generatedContentMap.set(index, generatedContent);
      },
    );
    const entries: Array<[number, SavedGeneratedContent]> = Array.from(
      generatedContentMap.entries(),
    ).reverse();

    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk: Array<[number, SavedGeneratedContent]> = entries.slice(
        i,
        i + CHUNK_SIZE,
      );
      const processPromises: Array<Promise<[number, string[]]>> = chunk.map(
        (entry: [number, SavedGeneratedContent]) =>
          this.processGeneratedContent(entry[0], entry[1], worksheet),
      );
      let results: Array<[number, string[]]> =
        await Promise.all(processPromises);
      results = results.sort((a, b) => a[0] - b[0]);
      results.forEach((result: [number, string[]]) => {
        const row: ExcelJS.Row = worksheet.getRow(result[0] + 2);
        result[1].forEach((value: string, index: number) => {
          const cell: ExcelJS.Cell = row.getCell(index + 1);
          cell.value = value;
        });
      });
      worksheet.getColumn(2).width = 30;
      worksheet.getColumn(3).width = 35;
      worksheet.getColumn(4).width = 100;
      worksheet.getColumn(5).width = 40;
      worksheet.getColumn(6).width = 100;
      worksheet.getColumn(7).width = 100;
      worksheet.getColumn(8).width = 100;
      await workbook.xlsx.writeFile('output.xlsx');
      console.log(`Processed ${i + CHUNK_SIZE} / ${entries.length}`);
    }
  }

  private async processGeneratedContent(
    index: number,
    generatedContent: SavedGeneratedContent,
    worksheet: ExcelJS.Worksheet,
  ): Promise<[number, string[]]> {
    const gradeMatch: RegExpMatchArray | null =
      generatedContent.standard.match(/(\d+)/);
    const gradeNumber: string = gradeMatch ? gradeMatch[0] : 'Unknown';
    const row = worksheet.getRow(index + 2);
    const idCell = row.getCell(3);
    const secondResponseCell = row.getCell(8);
    const rowExists: boolean =
      idCell.value === generatedContent.id && !!secondResponseCell.value;
    if (rowExists) {
      return [
        index,
        [
          row.getCell(1).value as string,
          row.getCell(2).value as string,
          row.getCell(3).value as string,
          row.getCell(4).value as string,
          row.getCell(5).value as string,
          row.getCell(6).value as string,
          row.getCell(7).value as string,
          row.getCell(8).value as string,
        ],
      ];
    }
    const generatedContentData: SavedGeneratedContentData = JSON.parse(
      generatedContent.content,
    );
    const generatedContentContext: SavedGeneratedContentContext = JSON.parse(
      generatedContent.context,
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
        JSON.stringify(JSON.stringify(selectedOption.answer).slice(1, -1)).slice(1, -1),
      );
    } else {
      userInteractionHistory = USER_INTERACTION_HISTORY.replace(
        '{{selectedOption}}',
        '',
      );
    }
    const initialResponse: string = await this.startConversation(
      generatedContent,
      generatedContentContext,
      userInteractionHistory,
      graphqlUrl,
      graphqlIdToken,
    );
    const userMessage: string =
      USER_MESSAGES[Math.floor(Math.random() * USER_MESSAGES.length)];
    const secondResponse: string = await this.continueConversation(
      generatedContent,
      generatedContentContext,
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
    return [index, rowValues];
  }

  private async startConversation(
    generatedContent: SavedGeneratedContent,
    generatedContentContext: SavedGeneratedContentContext,
    userInteractionHistory: string,
    graphqlUrl: string,
    graphqlIdToken: string,
  ): Promise<string> {
    return this.request(
      generatedContent,
      generatedContentContext,
      userInteractionHistory,
      graphqlUrl,
      graphqlIdToken,
      START_CONVERSATION_MUTATION,
    );
  }

  private async continueConversation(
    generatedContent: SavedGeneratedContent,
    generatedContentContext: SavedGeneratedContentContext,
    userInteractionHistory: string,
    userMessage: string,
    graphqlUrl: string,
    graphqlIdToken: string,
  ): Promise<string> {
    const graphqlQuery: string = CONTINUE_CONVERSATION_MUTATION.replace(
      '{{userMessage}}',
      userMessage,
    );
    return this.request(
      generatedContent,
      generatedContentContext,
      userInteractionHistory,
      graphqlUrl,
      graphqlIdToken,
      graphqlQuery,
    );
  }

  private async request(
    generatedContent: SavedGeneratedContent,
    generatedContentContext: SavedGeneratedContentContext,
    userInteractionHistory: string,
    graphqlUrl: string,
    graphqlIdToken: string,
    graphqlQuery: string,
  ): Promise<string> {
    graphqlQuery = graphqlQuery
      .replace('{{generatedContentId}}', generatedContent.id)
      .replace('{{userInteractionHistory}}', userInteractionHistory)
      .replace('{{grade}}', generatedContentContext.grade)
      .replace('{{domainId}}', generatedContentContext.domainId)
      .replace('{{course}}', generatedContentContext.course)
      .replace('{{standardId}}', generatedContentContext.standardId);

    try {
      const response: AxiosResponse<GenerateContentResponse> =
        await this.httpService
          .post(
            graphqlUrl,
            { query: graphqlQuery },
            { headers: { Authorization: graphqlIdToken } },
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
