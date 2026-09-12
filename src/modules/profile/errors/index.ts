import { AppError } from '@/infra/api/app-error';

export class ProfileNotFoundError extends AppError {
  public readonly code = 'ERR_PROFILE_NOT_FOUND';

  constructor(private readonly slug: string) {
    super(`Profile "${slug}" not found`);
  }

  public payload(): { slug: string } {
    return { slug: this.slug };
  }
}
