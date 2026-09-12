import { AppError } from '@/infra/api/app-error';

class SilentError extends AppError {
  readonly code = 'ERR_SILENT';
}

class ProfileMissingError extends AppError {
  readonly code = 'ERR_PROFILE_MISSING';

  constructor(private readonly slug: string) {
    super(`Profile "${slug}" not found`);
  }

  shouldBeLogged(): boolean {
    return true;
  }

  devMessage(): string {
    return `no profile row for slug ${this.slug}`;
  }

  payload(): Record<string, string | number | boolean> {
    return { slug: this.slug };
  }
}

describe('AppError', () => {
  it('should stay silent and payload-free by default', () => {
    const error = new SilentError('boom');

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('ERR_SILENT');
    expect(error.shouldBeLogged()).toBe(false);
    expect(error.devMessage()).toBe('boom');
    expect(error.payload()).toEqual({});
  });

  it('should honour everything a subclass overrides', () => {
    const error = new ProfileMissingError('onezee');

    expect(error.message).toBe('Profile "onezee" not found');
    expect(error.shouldBeLogged()).toBe(true);
    expect(error.devMessage()).toBe('no profile row for slug onezee');
    expect(error.payload()).toEqual({ slug: 'onezee' });
  });
});
