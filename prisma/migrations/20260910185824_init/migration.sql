-- CreateTable
CREATE TABLE "profile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "location" TEXT,
    "timezone" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_link" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "profile_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "company_url" TEXT,
    "location" TEXT,
    "started_at" DATE NOT NULL,
    "finished_at" DATE,
    "summary" TEXT,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement" (
    "id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "repository_url" TEXT,
    "status" TEXT NOT NULL,
    "stack" TEXT[],
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_state" (
    "id" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "applied_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "seed_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_slug_key" ON "profile"("slug");

-- CreateIndex
CREATE INDEX "profile_link_profile_id_idx" ON "profile_link"("profile_id");

-- CreateIndex
CREATE INDEX "skill_profile_id_idx" ON "skill"("profile_id");

-- CreateIndex
CREATE INDEX "experience_profile_id_idx" ON "experience"("profile_id");

-- CreateIndex
CREATE INDEX "achievement_experience_id_idx" ON "achievement"("experience_id");

-- CreateIndex
CREATE INDEX "project_profile_id_idx" ON "project"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_profile_id_slug_key" ON "project"("profile_id", "slug");

-- AddForeignKey
ALTER TABLE "profile_link" ADD CONSTRAINT "profile_link_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill" ADD CONSTRAINT "skill_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience" ADD CONSTRAINT "experience_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement" ADD CONSTRAINT "achievement_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
