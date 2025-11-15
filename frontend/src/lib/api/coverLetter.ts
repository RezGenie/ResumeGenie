import { apiClient } from './client';

export interface CoverLetterRequest {
  job_description: string;
  company_name?: string;
  position_title?: string;
}

export interface CoverLetterResponse {
  success: boolean;
  cover_letter: string;
  company_name: string;
  position_title: string;
  generated_at: string;
}

export const coverLetterService = {
  /**
   * Generate a cover letter for authenticated users
   */
  async generateCoverLetter(
    request: CoverLetterRequest
  ): Promise<CoverLetterResponse> {
    const { apiClient: client } = await import('./client');
    const response = await client.post<CoverLetterResponse>(
      '/genie/cover-letter',
      request
    );
    return response;
  },

  /**
   * Generate a cover letter for guest users
   */
  async generateCoverLetterGuest(
    request: CoverLetterRequest
  ): Promise<CoverLetterResponse> {
    const { apiClient: client } = await import('./client');
    const response = await client.post<CoverLetterResponse>(
      '/genie/guest/cover-letter',
      request
    );
    return response;
  },

  /**
   * Download cover letter as text file
   */
  downloadAsText(
    coverLetter: string,
    companyName: string,
    positionTitle: string
  ) {
    const blob = new Blob([coverLetter], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cover_Letter_${companyName}_${positionTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
