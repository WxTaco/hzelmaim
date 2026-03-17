/**
 * Shared frontend types mirroring backend API contracts.
 */

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export type ContainerState = 'provisioning' | 'running' | 'stopped' | 'failed';

export interface ContainerSummary {
  id: string;
  proxmox_ctid: number;
  name: string;
  node_name: string;
  state: ContainerState;
  created_at: string;
}

export interface CommandJob {
  id: string;
  container_id: string;
  program: string;
  args: string[];
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  stdout: string;
  stderr: string;
  created_at: string;
}
