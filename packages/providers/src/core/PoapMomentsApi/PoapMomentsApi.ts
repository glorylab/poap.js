import { InvalidMediaFileError } from './errors/InvalidMediaFileError';
import { MediaStatus } from './constants';
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreateMomentResponse } from './../../ports/MomentsApiProvider/Types/response';
import { CreateMomentInput } from './../../ports/MomentsApiProvider/Types/input';
import { MomentsApiProvider } from './../../ports/MomentsApiProvider/MomentsApiProvider';
import axios from 'axios';

const MOMENTS_BASE_URL = 'https://moments.poap.tech';

/**
 * PoapMomentsApi class provides methods to interact with the POAP Moments API
 * @class
 */
export class PoapMomentsApi implements MomentsApiProvider {
  /**
   * @constructor
   * @param {string} apiKey - The API key for the POAP Moments API
   * @param {string} [baseUrl='https://moments.poap.xyz'] - The base URL for the POAP Moments API
   */
  constructor(
    private apiKey: string,
    private baseUrl: string = MOMENTS_BASE_URL,
  ) {}

  /**
   * Fetch a signed URL for uploading a file
   * @returns {Promise<{ url: string; key: string }>} - A Promise that resolves to an object containing the signed URL and the media key
   */
  async getSignedUrl(): Promise<{ url: string; key: string }> {
    return await this.secureFetch(`${this.baseUrl}/moments/media-upload-url`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  /**
   * Upload a file using the signed URL
   * @param {Buffer} file - The file to be uploaded as a Buffer
   * @param {string} fileType - The file type
   * @param {string} signedUrl - The signed URL for uploading the file
   * @returns {Promise<void>} - A Promise that resolves when the file has been uploaded
   */
  async uploadFile(
    file: Buffer,
    signedUrl: string,
    fileType: string,
  ): Promise<void> {
    return await this.secureFetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': fileType,
      },
    });
  }
  /**
   * Fetches the media processing status.
   * @param {string} mediaKey - The key for the media file
   * @returns {Promise<MediaStatus>} - A Promise that resolves with the media processing status
   */
  async fetchMediaStatus(mediaKey: string): Promise<MediaStatus> {
    try {
      const response = await this.secureFetch(
        `${this.baseUrl}/media/${mediaKey}`,
        {
          method: 'GET',
        },
      );
      return response.status;
    } catch {
      // Do nothing
      return MediaStatus.IN_PROCESS;
    }
  }

  /**
   * Waits for the media to finish processing, checking its status at regular intervals.
   * If the media processing status is not MediaStatus.PROCESSED after a maximum number of tries,
   * an error is thrown. If the media status is MediaStatus.INVALID, an InvalidMediaFileError is thrown.
   *
   * @param {string} mediaKey - The key for the media file
   * @param {number} timeOut - The amount of time to wait until media is processed
   * @returns {Promise<void>} - A Promise that resolves when the media processing is complete
   */
  async waitForMediaProcessing(
    mediaKey: string,
    timeOut = 60000,
  ): Promise<void> {
    const delay = 2000;
    const maxTries = timeOut / delay;

    const checkStatus = async (tries: number): Promise<void> => {
      if (tries >= maxTries) {
        throw new Error(
          'Exceeded maximum number of tries to check media processing status.',
        );
      }
      const status = await this.fetchMediaStatus(mediaKey);

      if (status === MediaStatus.PROCESSED) {
        return;
      }

      if (status === MediaStatus.INVALID) {
        throw new InvalidMediaFileError();
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      return checkStatus(tries + 1);
    };

    await new Promise((resolve) => setTimeout(resolve, delay));
    return checkStatus(0);
  }

  /**
   * Create a moment using the provided input
   * @param {CreateMomentInput} input - The input for creating a moment
   * @returns {Promise<CreateMomentResponse>} - A Promise that resolves to the created moment
   */
  async createMoment(input: CreateMomentInput): Promise<CreateMomentResponse> {
    return await this.secureFetch(`${this.baseUrl}/moments`, {
      method: 'POST',
      body: JSON.stringify(input),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Sends a secure HTTP request to the Poap Registry API.
   *
   * @async
   * @private
   * @function
   * @name PoapRegistryApi#secureFetch
   * @param {string} url - The URL for the HTTP request.
   * @param {any} options - The options for the HTTP request.
   * @returns {Promise<any>} A Promise that resolves with the response from the API.
   */
  async secureFetch(url: string, options: any): Promise<any> {
    const headersWithApiKey = {
      ...options.headers,
      'x-api-key': this.apiKey,
    };

    const response = await axios(url, {
      method: options.method,
      data: options.body,
      headers: headersWithApiKey,
    });

    return response.data;
  }
}
