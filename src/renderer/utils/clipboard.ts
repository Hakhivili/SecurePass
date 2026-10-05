import { getApi } from '../services/ipc';

export async function copySecret(value: string): Promise<void> {
  await getApi().clipboard.copySecret(value);
}
