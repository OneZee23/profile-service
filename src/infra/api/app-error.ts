export abstract class AppError extends Error {
  public abstract readonly code: string;

  public shouldBeLogged(): boolean {
    return false;
  }

  public devMessage(): string {
    return this.message;
  }

  public payload(): Record<string, string | number | boolean> {
    return {};
  }
}
