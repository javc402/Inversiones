export type NewsStatus = 'draft' | 'scheduled' | 'published';

export interface NewsArticle {
  id: string;
  userEmail: string;
  title: string;
  slug: string;
  sourceUrl: string;
  summary: string;
  content: string;
  coverImageUrl: string;
  category: string;
  tags: string[];
  status: NewsStatus;
  scheduledAt: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsArticleInput {
  title: string;
  slug: string;
  sourceUrl: string;
  summary: string;
  content: string;
  coverImageUrl: string;
  category: string;
  tags: string[];
  status: NewsStatus;
  scheduledAt: string;
}

const NEWS_STORAGE_KEY = 'inversiones_news_articles';

function loadAllArticles(): NewsArticle[] {
  try {
    const stored = localStorage.getItem(NEWS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as NewsArticle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAllArticles(articles: NewsArticle[]): void {
  localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(articles));
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function slugifyNewsTitle(title: string): string {
  return normalizeSlug(title);
}

export function listUserNews(userEmail: string): NewsArticle[] {
  return loadAllArticles()
    .filter((article) => article.userEmail === userEmail)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function validateSourceUrl(sourceUrl: string): string {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch {
    throw new Error('La URL de la fuente no es válida.');
  }
}

function validateArticleInput(input: NewsArticleInput): void {
  if (!input.title.trim()) throw new Error('El título es obligatorio.');
  if (!input.slug.trim()) throw new Error('El slug es obligatorio.');
  if (!input.summary.trim()) throw new Error('El resumen es obligatorio.');
  if (!input.content.trim()) throw new Error('El contenido es obligatorio.');
  if (!input.category.trim()) throw new Error('La categoría es obligatoria.');
  if (!input.status) throw new Error('El estado es obligatorio.');
}

function resolvePublishedAt(status: NewsStatus, currentValue: string | null = null): string | null {
  if (status === 'published') return currentValue ?? nowIso();
  return null;
}

export function createNewsArticle(userEmail: string, input: NewsArticleInput): NewsArticle {
  validateArticleInput(input);

  const articles = loadAllArticles();
  const slug = normalizeSlug(input.slug);

  if (!slug) throw new Error('El slug es obligatorio.');
  if (articles.some((article) => article.slug === slug && article.userEmail === userEmail)) {
    throw new Error('Ya existe una noticia tuya con ese slug.');
  }

  const sourceUrl = validateSourceUrl(input.sourceUrl);
  const timestamp = nowIso();
  const article: NewsArticle = {
    id: `news-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    userEmail,
    title: input.title.trim(),
    slug,
    sourceUrl,
    summary: input.summary.trim(),
    content: input.content.trim(),
    coverImageUrl: input.coverImageUrl.trim(),
    category: input.category.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    status: input.status,
    scheduledAt: input.scheduledAt,
    publishedAt: resolvePublishedAt(input.status),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  articles.unshift(article);
  saveAllArticles(articles);
  return article;
}

export function updateNewsArticle(userEmail: string, articleId: string, input: NewsArticleInput): NewsArticle {
  validateArticleInput(input);

  const articles = loadAllArticles();
  const index = articles.findIndex((article) => article.id === articleId && article.userEmail === userEmail);
  if (index === -1) throw new Error('No se encontró la noticia solicitada.');

  const slug = normalizeSlug(input.slug);
  if (!slug) throw new Error('El slug es obligatorio.');
  if (articles.some((article) => article.id !== articleId && article.userEmail === userEmail && article.slug === slug)) {
    throw new Error('Ya existe una noticia tuya con ese slug.');
  }

  const previous = articles[index];
  const nextStatus = input.status;
  const sourceUrl = validateSourceUrl(input.sourceUrl);
  const timestamp = nowIso();

  const next: NewsArticle = {
    ...previous,
    title: input.title.trim(),
    slug,
    sourceUrl,
    summary: input.summary.trim(),
    content: input.content.trim(),
    coverImageUrl: input.coverImageUrl.trim(),
    category: input.category.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    status: nextStatus,
    scheduledAt: input.scheduledAt,
    publishedAt: resolvePublishedAt(nextStatus, previous.publishedAt),
    updatedAt: timestamp,
  };

  articles[index] = next;
  saveAllArticles(articles);
  return next;
}

export function deleteNewsArticle(userEmail: string, articleId: string): void {
  const articles = loadAllArticles();
  const next = articles.filter((article) => !(article.id === articleId && article.userEmail === userEmail));
  if (next.length === articles.length) throw new Error('No se encontró la noticia solicitada.');
  saveAllArticles(next);
}

export function toggleNewsPublication(userEmail: string, articleId: string): NewsArticle {
  const articles = loadAllArticles();
  const index = articles.findIndex((article) => article.id === articleId && article.userEmail === userEmail);
  if (index === -1) throw new Error('No se encontró la noticia solicitada.');

  const current = articles[index];
  const nextStatus: NewsStatus = current.status === 'published' ? 'draft' : 'published';
  const next: NewsArticle = {
    ...current,
    status: nextStatus,
    publishedAt: resolvePublishedAt(nextStatus, current.publishedAt),
    updatedAt: nowIso(),
  };

  articles[index] = next;
  saveAllArticles(articles);
  return next;
}

export function publishArticleNow(userEmail: string, articleId: string): NewsArticle {
  const articles = loadAllArticles();
  const index = articles.findIndex((article) => article.id === articleId && article.userEmail === userEmail);
  if (index === -1) throw new Error('No se encontró la noticia solicitada.');

  const current = articles[index];
  const next: NewsArticle = {
    ...current,
    status: 'published',
    publishedAt: nowIso(),
    updatedAt: nowIso(),
  };

  articles[index] = next;
  saveAllArticles(articles);
  return next;
}

export function seedNewsForUser(userEmail: string): void {
  const existing = listUserNews(userEmail);
  if (existing.length > 0) return;

  const timestamp = nowIso();
  const demoArticles: NewsArticle[] = [
    {
      id: `news-${Date.now()}-a`,
      userEmail,
      title: 'Mercado abre con sesgo alcista',
      slug: 'mercado-abre-con-sesgo-alcista',
      sourceUrl: 'https://example.com/fuente-mercado',
      summary: 'Panorama inicial del mercado con focos en índices y divisas.',
      content: 'Contenido de ejemplo para la noticia. Aquí iría el cuerpo completo del artículo.',
      coverImageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      category: 'Mercados',
      tags: ['mercados', 'sesion'],
      status: 'draft',
      scheduledAt: '',
      publishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: `news-${Date.now()}-b`,
      userEmail,
      title: 'Bitcoin supera resistencia clave',
      slug: 'bitcoin-supera-resistencia-clave',
      sourceUrl: 'https://example.com/fuente-bitcoin',
      summary: 'La cripto rompe una zona técnica y deja señales de continuidad.',
      content: 'Contenido de ejemplo para la segunda noticia.',
      coverImageUrl: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&w=1200&q=80',
      category: 'Cripto',
      tags: ['crypto', 'btc'],
      status: 'published',
      scheduledAt: '',
      publishedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  saveAllArticles([...loadAllArticles(), ...demoArticles]);
}
