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

/**
 * Container summary for list views.
 */
export interface ContainerSummary {
  id: string;
  proxmox_ctid: number;
  name: string;
  node_name: string;
  state: ContainerState;
  created_at: string;
}

/**
 * Full container record with all details.
 */
export interface ContainerRecord extends ContainerSummary {}

/**
 * Result returned from container creation, includes initial password.
 */
export interface CreateContainerResult extends ContainerRecord {
  initial_password?: string;
}

/**
 * Container metrics (CPU, memory, network).
 */
export interface ContainerMetrics {
  cpu_percent: number;
  memory_used_mb: number;
  memory_limit_mb: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
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
