import { ERROR_CODES } from '@petsystem/contracts';

import { AppError } from './app-error.js';

export const notFound = (what = 'Registro'): AppError =>
  new AppError(404, ERROR_CODES.NOT_FOUND, `${what} não encontrado`);
