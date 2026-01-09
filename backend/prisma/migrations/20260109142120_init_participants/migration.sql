-- CreateTable
CREATE TABLE "passages" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL DEFAULT 'hbo',
    "peakEvent" TEXT,
    "thematicSpine" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clauses" (
    "id" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "clauseIndex" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "gloss" TEXT NOT NULL,
    "clauseType" TEXT NOT NULL,
    "isMainline" BOOLEAN NOT NULL DEFAULT false,
    "chainPosition" TEXT,
    "lemma" TEXT,
    "lemmaAscii" TEXT,
    "binyan" TEXT,
    "tense" TEXT,
    "hasKi" BOOLEAN NOT NULL DEFAULT false,
    "subjects" JSONB,
    "objects" JSONB,
    "names" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "hebrew" TEXT NOT NULL,
    "gloss" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" TEXT,
    "referenceStatus" TEXT,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_relations" (
    "id" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participant_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clauseId" TEXT,
    "category" TEXT NOT NULL,
    "eventCore" TEXT NOT NULL,
    "discourseFunction" TEXT,
    "chainPosition" TEXT,
    "narrativeFunction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_roles" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "participantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_modifiers" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "happened" TEXT,
    "realness" TEXT,
    "when" TEXT,
    "viewpoint" TEXT,
    "phase" TEXT,
    "repetition" TEXT,
    "onPurpose" TEXT,
    "howKnown" TEXT,
    "causation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_acts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quotationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speech_acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_pragmatics" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "register" TEXT,
    "socialAxis" TEXT,
    "prominence" TEXT,
    "pacing" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pragmatics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_emotions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT,
    "primary" TEXT NOT NULL,
    "secondary" TEXT,
    "intensity" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_emotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "narrator_stances" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "stance" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "narrator_stances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audience_responses" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audience_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "la_retrievals" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "emotionTags" JSONB,
    "eventTags" JSONB,
    "registerTags" JSONB,
    "discourseTags" JSONB,
    "socialTags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "la_retrievals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "figuratives" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "isFigurative" BOOLEAN NOT NULL DEFAULT true,
    "figureType" TEXT NOT NULL,
    "sourceDomain" TEXT,
    "targetDomain" TEXT,
    "literalMeaning" TEXT,
    "intendedMeaning" TEXT,
    "transferability" TEXT,
    "translationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "figuratives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_terms" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "sourceLemma" TEXT NOT NULL,
    "semanticDomain" TEXT NOT NULL,
    "consistency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "key_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discourse_relations" (
    "id" TEXT NOT NULL,
    "passageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discourse_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bhsa_words" (
    "id" TEXT NOT NULL,
    "nodeId" INTEGER NOT NULL,
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "lex" TEXT,
    "lexUtf8" TEXT,
    "sp" TEXT,
    "gloss" TEXT,
    "vs" TEXT,
    "vt" TEXT,
    "function" TEXT,

    CONSTRAINT "bhsa_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bhsa_clauses" (
    "id" TEXT NOT NULL,
    "nodeId" INTEGER NOT NULL,
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "clauseType" TEXT,
    "text" TEXT NOT NULL,

    CONSTRAINT "bhsa_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bhsa_verses" (
    "id" TEXT NOT NULL,
    "nodeId" INTEGER NOT NULL,
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "bhsa_verses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "passages_reference_key" ON "passages"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "clauses_passageId_clauseIndex_key" ON "clauses"("passageId", "clauseIndex");

-- CreateIndex
CREATE UNIQUE INDEX "participants_passageId_participantId_key" ON "participants"("passageId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "events_passageId_eventId_key" ON "events"("passageId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_modifiers_eventId_key" ON "event_modifiers"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "speech_acts_eventId_key" ON "speech_acts"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_pragmatics_eventId_key" ON "event_pragmatics"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "narrator_stances_eventId_key" ON "narrator_stances"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "audience_responses_eventId_key" ON "audience_responses"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "la_retrievals_eventId_key" ON "la_retrievals"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "figuratives_eventId_key" ON "figuratives"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "bhsa_words_nodeId_key" ON "bhsa_words"("nodeId");

-- CreateIndex
CREATE INDEX "bhsa_words_book_chapter_verse_idx" ON "bhsa_words"("book", "chapter", "verse");

-- CreateIndex
CREATE UNIQUE INDEX "bhsa_clauses_nodeId_key" ON "bhsa_clauses"("nodeId");

-- CreateIndex
CREATE INDEX "bhsa_clauses_book_chapter_verse_idx" ON "bhsa_clauses"("book", "chapter", "verse");

-- CreateIndex
CREATE UNIQUE INDEX "bhsa_verses_nodeId_key" ON "bhsa_verses"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "bhsa_verses_book_chapter_verse_key" ON "bhsa_verses"("book", "chapter", "verse");

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_relations" ADD CONSTRAINT "participant_relations_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_relations" ADD CONSTRAINT "participant_relations_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_relations" ADD CONSTRAINT "participant_relations_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "clauses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_roles" ADD CONSTRAINT "event_roles_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_roles" ADD CONSTRAINT "event_roles_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_modifiers" ADD CONSTRAINT "event_modifiers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "speech_acts" ADD CONSTRAINT "speech_acts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_pragmatics" ADD CONSTRAINT "event_pragmatics_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_emotions" ADD CONSTRAINT "event_emotions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_emotions" ADD CONSTRAINT "event_emotions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "narrator_stances" ADD CONSTRAINT "narrator_stances_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audience_responses" ADD CONSTRAINT "audience_responses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "la_retrievals" ADD CONSTRAINT "la_retrievals_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "figuratives" ADD CONSTRAINT "figuratives_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_terms" ADD CONSTRAINT "key_terms_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discourse_relations" ADD CONSTRAINT "discourse_relations_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "passages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discourse_relations" ADD CONSTRAINT "discourse_relations_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discourse_relations" ADD CONSTRAINT "discourse_relations_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
