import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import {
  MediaDeleteResponse,
  MediaItem,
  MediaListParams,
  MediaListResponse,
  MediaMetadataPayload,
  MediaMultipleUploadResponse,
  MediaUploadResponse,
  MediaUsageResponse,
} from '../models/media.models';
import { ApiItemResponse } from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminMediaService {
  private readonly mediaApiUrl = `${environment.apiUrl}/admin/media`;

  constructor(private readonly http: HttpClient) {}

  listMedia(options: MediaListParams = {}) {
    let params = new HttpParams();

    if (options.page) params = params.set('page', options.page);
    if (options.limit) params = params.set('limit', options.limit);
    if (options.search) params = params.set('q', options.search);
    if (options.fileType && options.fileType !== 'all') {
      params = params.set('fileType', options.fileType);
    }
    if (options.sort) params = params.set('sort', options.sort);

    return this.http.get<MediaListResponse>(this.mediaApiUrl, { params });
  }

  getMedia(id: string) {
    return this.http.get<ApiItemResponse<MediaItem>>(`${this.mediaApiUrl}/${id}`);
  }

  uploadMedia(file: File, metadata: Partial<MediaMetadataPayload> = {}) {
    const formData = this.buildFormData([file], metadata, 'file');
    return this.http.post<MediaUploadResponse>(this.mediaApiUrl, formData);
  }

  uploadMultipleMedia(files: File[], metadata: Partial<MediaMetadataPayload> = {}) {
    const formData = this.buildFormData(files, metadata, 'files');
    return this.http.post<MediaMultipleUploadResponse>(`${this.mediaApiUrl}/multiple`, formData);
  }

  updateMedia(id: string, payload: MediaMetadataPayload) {
    return this.http.patch<ApiItemResponse<MediaItem>>(`${this.mediaApiUrl}/${id}`, payload);
  }

  getMediaUsage(id: string) {
    return this.http.get<MediaUsageResponse>(`${this.mediaApiUrl}/${id}/usage`);
  }

  deleteMedia(id: string) {
    return this.http.delete<MediaDeleteResponse>(`${this.mediaApiUrl}/${id}`);
  }

  private buildFormData(
    files: File[],
    metadata: Partial<MediaMetadataPayload>,
    fileField: 'file' | 'files'
  ): FormData {
    const formData = new FormData();
    files.forEach((file) => formData.append(fileField, file, file.name));

    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    return formData;
  }
}
