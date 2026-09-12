import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { WebserverConfig } from '@/infra/webserver/webserver.config';

function propertiesFailing(section: object): string[] {
  return validateSync(plainToInstance(WebserverConfig, section)).map(
    (error) => error.property,
  );
}

describe('WebserverConfig', () => {
  it('should accept its own defaults', () => {
    const config = plainToInstance(WebserverConfig, {});

    expect(propertiesFailing({})).toEqual([]);
    expect(config.port).toBe(3000);
    expect(config.publicUrl).toBe('http://localhost:3000/');
  });

  it('should accept a configured public url that ends in a slash', () => {
    expect(
      propertiesFailing({ port: 8080, publicUrl: 'https://cv.onezee.dev/' }),
    ).toEqual([]);
  });

  it('should reject a public url without a trailing slash', () => {
    expect(propertiesFailing({ publicUrl: 'https://cv.onezee.dev' })).toEqual([
      'publicUrl',
    ]);
  });

  it('should reject a port that is not a positive integer', () => {
    expect(propertiesFailing({ port: 'nope' })).toEqual(['port']);
    expect(propertiesFailing({ port: -1 })).toEqual(['port']);
  });
});
