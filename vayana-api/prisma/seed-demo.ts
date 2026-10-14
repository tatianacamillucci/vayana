/**
 * Demo seed script — run with:
 *   SEED_DEMO=true npx ts-node --project tsconfig.json prisma/seed-demo.ts
 *
 * Idempotent: guards by org slug. Safe to run multiple times.
 */
import { PrismaClient, TaskStatus, TaskPriority, MemberRole, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

if (process.env.SEED_DEMO !== 'true') {
  console.log('Set SEED_DEMO=true to run this script.');
  process.exit(0);
}

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo1234!';
const ORG_NAME = 'Acme Corp';

async function main() {
  console.log('🌱 Seeding demo data…');

  // ── Organisation ──────────────────────────────────────────────────────────
  let org = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: ORG_NAME },
    });
    console.log(`  ✔ Organization: ${org.name}`);
  } else {
    console.log(`  ↩ Organization already exists: ${org.name}`);
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const usersData = [
    { email: 'alice@acme.com', firstName: 'Alice', lastName: 'Romano', role: MemberRole.OWNER },
    { email: 'bob@acme.com', firstName: 'Bob', lastName: 'Ferrari', role: MemberRole.TEAM_LEADER },
    { email: 'carla@acme.com', firstName: 'Carla', lastName: 'Bianchi', role: MemberRole.MEMBER },
    { email: 'dino@acme.com', firstName: 'Dino', lastName: 'Greco', role: MemberRole.MEMBER },
  ];

  const users: Record<string, string> = {}; // email → id

  for (const u of usersData) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: u.email, passwordHash: hash, firstName: u.firstName, lastName: u.lastName },
      });
    }
    users[u.email] = user.id;

    const existing = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    });
    if (!existing) {
      await prisma.organizationMember.create({
        data: { organizationId: org.id, userId: user.id, role: u.role },
      });
    }
  }
  console.log(`  ✔ Users: ${Object.keys(users).join(', ')}`);

  const alice = users['alice@acme.com'];
  const bob = users['bob@acme.com'];
  const carla = users['carla@acme.com'];
  const dino = users['dino@acme.com'];

  // ── Projects ──────────────────────────────────────────────────────────────
  const projectsData = [
    { name: 'Lancio Prodotto Q2', color: '#6366f1', phases: ['Ricerca', 'Design', 'Sviluppo', 'Testing', 'Lancio'] },
    { name: 'Redesign Sito Web', color: '#10b981', phases: ['Discovery', 'Wireframe', 'Visual Design', 'Implementazione'] },
    { name: 'Migrazione Backend', color: '#f59e0b', phases: ['Analisi', 'Pianificazione', 'Esecuzione', 'Validazione'] },
  ];

  type ProjectSeed = { id: string; phases: { id: string; name: string }[] };
  const projects: ProjectSeed[] = [];

  for (const pd of projectsData) {
    let project = await prisma.project.findFirst({
      where: { organizationId: org.id, name: pd.name },
      include: { phases: true },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          organizationId: org.id,
          name: pd.name,
          color: pd.color,
          createdById: alice,
          status: 'ACTIVE',
          phases: {
            create: pd.phases.map((name, i) => ({
              organizationId: org.id,
              name,
              position: (i + 1) * 1000,
            })),
          },
        },
        include: { phases: true },
      });
      console.log(`  ✔ Project: ${project.name}`);
    } else {
      console.log(`  ↩ Project already exists: ${project.name}`);
    }

    projects.push({ id: project.id, phases: project.phases.map((p) => ({ id: p.id, name: p.name })) });
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const now = new Date();
  const day = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d;
  };

  type TaskSeed = {
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueOffset: number | null; // days from today
    phaseIdx: number;
    assignees: string[];
  };

  const tasksByProject: TaskSeed[][] = [
    // Project 0: Lancio Prodotto Q2
    [
      { title: 'Definire personas e segmenti target', status: 'DONE', priority: 'HIGH', dueOffset: -10, phaseIdx: 0, assignees: [alice, carla] },
      { title: 'Analisi competitors', status: 'DONE', priority: 'MEDIUM', dueOffset: -8, phaseIdx: 0, assignees: [bob] },
      { title: 'Survey utenti beta', status: 'DONE', priority: 'LOW', dueOffset: -5, phaseIdx: 0, assignees: [carla] },
      { title: 'Mockup landing page', status: 'IN_PROGRESS', priority: 'HIGH', dueOffset: 2, phaseIdx: 1, assignees: [carla] },
      { title: 'Design sistema iconografia', status: 'IN_PROGRESS', priority: 'MEDIUM', dueOffset: 5, phaseIdx: 1, assignees: [carla, dino] },
      { title: 'Prototipo interattivo Figma', status: 'TODO', priority: 'HIGH', dueOffset: 8, phaseIdx: 1, assignees: [carla] },
      { title: 'Setup CI/CD pipeline', status: 'IN_PROGRESS', priority: 'URGENT', dueOffset: 0, phaseIdx: 2, assignees: [bob, dino] },
      { title: 'Implementare autenticazione OAuth', status: 'TODO', priority: 'HIGH', dueOffset: 7, phaseIdx: 2, assignees: [bob] },
      { title: 'API integrazione pagamenti', status: 'TODO', priority: 'HIGH', dueOffset: 14, phaseIdx: 2, assignees: [dino] },
      { title: 'Test di carico', status: 'TODO', priority: 'MEDIUM', dueOffset: 18, phaseIdx: 3, assignees: [bob, dino] },
      { title: 'Revisione copy marketing', status: 'TODO', priority: 'LOW', dueOffset: 20, phaseIdx: 4, assignees: [alice] },
    ],
    // Project 1: Redesign Sito Web
    [
      { title: 'Audit contenuti esistenti', status: 'DONE', priority: 'MEDIUM', dueOffset: -12, phaseIdx: 0, assignees: [alice] },
      { title: 'Definire architettura informazioni', status: 'DONE', priority: 'HIGH', dueOffset: -7, phaseIdx: 0, assignees: [alice, carla] },
      { title: 'Wireframe homepage', status: 'DONE', priority: 'HIGH', dueOffset: -3, phaseIdx: 1, assignees: [carla] },
      { title: 'Wireframe pagina prodotto', status: 'IN_REVIEW', priority: 'HIGH', dueOffset: -1, phaseIdx: 1, assignees: [carla] },
      { title: 'Wireframe checkout', status: 'IN_REVIEW', priority: 'MEDIUM', dueOffset: 1, phaseIdx: 1, assignees: [carla, dino] },
      { title: 'Definire palette colori e tipografia', status: 'IN_PROGRESS', priority: 'HIGH', dueOffset: 3, phaseIdx: 2, assignees: [carla] },
      { title: 'Disegno componenti UI', status: 'TODO', priority: 'HIGH', dueOffset: 9, phaseIdx: 2, assignees: [carla] },
      { title: 'Sviluppo frontend Next.js', status: 'TODO', priority: 'URGENT', dueOffset: 15, phaseIdx: 3, assignees: [bob, dino] },
      { title: 'Integrazione CMS', status: 'TODO', priority: 'MEDIUM', dueOffset: 20, phaseIdx: 3, assignees: [dino] },
      { title: 'SEO e analytics setup', status: 'TODO', priority: 'LOW', dueOffset: 25, phaseIdx: 3, assignees: [alice] },
    ],
    // Project 2: Migrazione Backend
    [
      { title: 'Mappare servizi esistenti', status: 'DONE', priority: 'HIGH', dueOffset: -15, phaseIdx: 0, assignees: [bob] },
      { title: 'Identificare dipendenze critiche', status: 'DONE', priority: 'URGENT', dueOffset: -10, phaseIdx: 0, assignees: [bob, dino] },
      { title: 'Piano di rollback', status: 'DONE', priority: 'HIGH', dueOffset: -6, phaseIdx: 1, assignees: [bob] },
      { title: 'Setup nuovo ambiente staging', status: 'DONE', priority: 'HIGH', dueOffset: -4, phaseIdx: 1, assignees: [dino] },
      { title: 'Migrazione database principale', status: 'IN_PROGRESS', priority: 'URGENT', dueOffset: 0, phaseIdx: 2, assignees: [bob, dino] },
      { title: 'Migrazione servizio auth', status: 'IN_PROGRESS', priority: 'HIGH', dueOffset: 2, phaseIdx: 2, assignees: [bob] },
      { title: 'Migrazione servizio notifiche', status: 'TODO', priority: 'MEDIUM', dueOffset: 5, phaseIdx: 2, assignees: [dino] },
      { title: 'Test regressione completi', status: 'TODO', priority: 'HIGH', dueOffset: 10, phaseIdx: 3, assignees: [alice, bob] },
      { title: 'Verifica SLA e performance', status: 'TODO', priority: 'HIGH', dueOffset: 12, phaseIdx: 3, assignees: [bob] },
      { title: 'Documentazione finale', status: 'TODO', priority: 'LOW', dueOffset: 15, phaseIdx: 3, assignees: [alice] },
    ],
  ];

  const createdTaskIds: string[] = [];

  for (let pi = 0; pi < projects.length; pi++) {
    const proj = projects[pi];
    const taskSeeds = tasksByProject[pi];

    // Check if tasks already seeded for this project
    const existingCount = await prisma.task.count({ where: { projectId: proj.id } });
    if (existingCount > 0) {
      console.log(`  ↩ Tasks already seeded for project ${pi}`);
      const existing = await prisma.task.findMany({ where: { projectId: proj.id }, select: { id: true } });
      createdTaskIds.push(...existing.map((t) => t.id));
      continue;
    }

    for (let ti = 0; ti < taskSeeds.length; ti++) {
      const ts = taskSeeds[ti];
      const phase = proj.phases[ts.phaseIdx] ?? proj.phases[0];

      const task = await prisma.task.create({
        data: {
          organizationId: org.id,
          projectId: proj.id,
          phaseId: phase.id,
          title: ts.title,
          status: ts.status,
          priority: ts.priority,
          dueDate: ts.dueOffset !== null ? day(ts.dueOffset) : undefined,
          createdById: alice,
          position: (ti + 1) * 1000,
          assignments: {
            create: ts.assignees.map((uid) => ({
              userId: uid,
              role: 'ASSIGNEE' as const,
            })),
          },
        },
      });
      createdTaskIds.push(task.id);
    }
    console.log(`  ✔ Tasks for project ${pi}: ${taskSeeds.length}`);
  }

  // ── Portfolio ─────────────────────────────────────────────────────────────
  let portfolio = await prisma.portfolio.findFirst({ where: { organizationId: org.id, name: 'Q2 2026' } });
  if (!portfolio) {
    portfolio = await prisma.portfolio.create({
      data: {
        organizationId: org.id,
        name: 'Q2 2026',
        description: 'Tutti i progetti del secondo trimestre 2026',
        color: '#6366f1',
        ownerId: alice,
        projects: {
          create: projects.map((p) => ({ projectId: p.id })),
        },
      },
    });
    console.log(`  ✔ Portfolio: ${portfolio.name}`);
  } else {
    console.log(`  ↩ Portfolio already exists`);
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  const notifCount = await prisma.notification.count({ where: { organizationId: org.id } });
  if (notifCount === 0 && createdTaskIds.length > 0) {
    const notifData = [
      { userId: alice, title: 'Task assegnato: Setup CI/CD pipeline', body: 'Bob ti ha assegnato un task urgente.', readAt: null },
      { userId: carla, title: 'Task assegnato: Mockup landing page', body: 'Alice ti ha assegnato un task.', readAt: null },
      { userId: dino, title: 'Task assegnato: API integrazione pagamenti', body: 'Alice ti ha assegnato un task.', readAt: null },
      { userId: bob, title: 'Task assegnato: Migrazione database principale', body: 'Alice ti ha assegnato un task urgente.', readAt: null },
      { userId: alice, title: 'Task assegnato: Analisi competitors', body: 'Completato da Bob.', readAt: new Date(Date.now() - 86400_000) },
    ];

    for (const n of notifData) {
      await prisma.notification.create({
        data: {
          organizationId: org.id,
          userId: n.userId,
          type: NotificationType.TASK_ASSIGNED,
          title: n.title,
          body: n.body,
          readAt: n.readAt,
          projectId: projects[0]?.id,
        },
      });
    }
    console.log(`  ✔ Notifications: ${notifData.length}`);
  } else {
    console.log(`  ↩ Notifications already seeded`);
  }

  console.log('\n✅ Demo seed complete.');
  console.log(`   Login: alice@acme.com / ${DEMO_PASSWORD}`);
  console.log(`          bob@acme.com   / ${DEMO_PASSWORD}`);
  console.log(`          carla@acme.com / ${DEMO_PASSWORD}`);
  console.log(`          dino@acme.com  / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
