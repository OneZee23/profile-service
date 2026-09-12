import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { ResumeConfig } from './resume.config';

function failedPaths(errors: ValidationError[], prefix = ''): string[] {
  return errors.flatMap((error) => {
    const path = prefix ? `${prefix}.${error.property}` : error.property;

    return error.children && error.children.length > 0
      ? failedPaths(error.children, path)
      : [path];
  });
}

function validateResume(plain: object): string[] {
  return failedPaths(validateSync(plainToInstance(ResumeConfig, plain)));
}

const wellFormed = {
  profile: {
    slug: 'onezee',
    name: 'Nikita Shevelev',
    headline: 'Senior Backend Engineer',
    description:
      'Node.js backend engineer building payment and reward systems.',
    location: 'Belgrade, Serbia',
    timezone: 'Europe/Belgrade',
    available: true,
  },
  links: [
    { kind: 'GITHUB', label: 'GitHub', url: 'https://github.com/onezee23' },
  ],
  skills: [
    { name: 'Node.js / TypeScript', category: 'Backend', level: 'EXPERT' },
  ],
  experience: [
    {
      company: 'iMe Lab',
      position: 'Senior Backend Engineer',
      companyUrl: 'https://imem.app/',
      location: 'Remote',
      startedAt: '2021-05',
      summary: 'Reward, ad and premium microservices on NestJS.',
      achievements: ['Cut reward payout latency by an order of magnitude'],
    },
  ],
  projects: [
    {
      name: 'profile-service',
      slug: 'profile-service',
      description: 'This service.',
      repositoryUrl: 'https://github.com/onezee23/profile-service',
      status: 'LIVE',
      stack: ['NestJS', 'Prisma', 'GraphQL'],
    },
  ],
};

describe('ResumeConfig', () => {
  it('accepts a well-formed résumé', () => {
    expect(validateResume(wellFormed)).toEqual([]);
  });

  it('accepts a full ISO day and an open-ended job', () => {
    expect(
      validateResume({
        ...wellFormed,
        experience: [
          { ...wellFormed.experience[0], startedAt: '2021-05-17' },
          {
            company: 'Freelance',
            position: 'Backend Engineer',
            startedAt: '2019-01',
            finishedAt: '2021-04',
            achievements: [],
          },
        ],
      }),
    ).toEqual([]);
  });

  it('rejects an unknown skill level and names the offending property', () => {
    expect(
      validateResume({
        ...wellFormed,
        skills: [{ name: 'Rust', category: 'Backend', level: 'WIZARD' }],
      }),
    ).toEqual(['skills.0.level']);
  });

  it('rejects a start date that is not YYYY-MM or YYYY-MM-DD', () => {
    expect(
      validateResume({
        ...wellFormed,
        experience: [{ ...wellFormed.experience[0], startedAt: 'May 2021' }],
      }),
    ).toEqual(['experience.0.startedAt']);
  });

  it('rejects a profile with no slug', () => {
    const { slug, ...withoutSlug } = wellFormed.profile;

    expect(validateResume({ ...wellFormed, profile: withoutSlug })).toEqual([
      'profile.slug',
    ]);
  });

  it('rejects a link with an unknown kind', () => {
    expect(
      validateResume({
        ...wellFormed,
        links: [{ kind: 'MYSPACE', label: 'MySpace', url: 'https://x.test/' }],
      }),
    ).toEqual(['links.0.kind']);
  });

  it('rejects an empty config section', () => {
    expect(validateResume({})).toEqual(['profile']);
  });
});
