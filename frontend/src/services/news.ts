import { supabase } from '@lib/supabase';

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

interface NewsArticleRow {
  id: string;
  title: string;
  slug: string;
  source_url: string;
  summary: string;
  content: string;
  cover_image_url: string;
  category: string;
  tags: string[];
  status: NewsStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
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

function mapRowToArticle(row: NewsArticleRow): NewsArticle {
  return {
    id: row.id,
    userEmail: '',
    title: row.title,
    slug: row.slug,
    sourceUrl: row.source_url,
    summary: row.summary,
    content: row.content,
    coverImageUrl: row.cover_image_url,
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: row.status,
    scheduledAt: row.scheduled_at ?? '',
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

export async function listUserNews(_userEmail: string): Promise<NewsArticle[]> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => mapRowToArticle(row as NewsArticleRow));
}

export async function createNewsArticle(_userEmail: string, input: NewsArticleInput): Promise<NewsArticle> {
  validateArticleInput(input);

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error('No hay un usuario autenticado para crear noticias.');
  }

  const slug = normalizeSlug(input.slug);
  if (!slug) throw new Error('El slug es obligatorio.');

  const { data: duplicateSlug, error: duplicateError } = await supabase
    .from('news_articles')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', slug)
    .limit(1);

  if (duplicateError) throw duplicateError;
  if (duplicateSlug && duplicateSlug.length > 0) {
    throw new Error('Ya existe una noticia tuya con ese slug.');
  }

  const sourceUrl = validateSourceUrl(input.sourceUrl);
  const publishedAt = resolvePublishedAt(input.status);
  const timestamp = nowIso();

  const { data, error } = await supabase
    .from('news_articles')
    .insert({
      user_id: userId,
      title: input.title.trim(),
      slug,
      source_url: sourceUrl,
      summary: input.summary.trim(),
      content: input.content.trim(),
      cover_image_url: input.coverImageUrl.trim(),
      category: input.category.trim(),
      tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
      status: input.status,
      scheduled_at: input.scheduledAt || null,
      published_at: publishedAt,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select('*')
    .single();

  if (error) throw error;

  return mapRowToArticle(data as NewsArticleRow);
}

export async function updateNewsArticle(_userEmail: string, articleId: string, input: NewsArticleInput): Promise<NewsArticle> {
  validateArticleInput(input);

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error('No hay un usuario autenticado para actualizar noticias.');
  }

  const { data: previousData, error: previousError } = await supabase
    .from('news_articles')
    .select('*')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (previousError || !previousData) {
    throw new Error('No se encontró la noticia solicitada.');
  }

  const previous = previousData as NewsArticleRow;
  const slug = normalizeSlug(input.slug);
  if (!slug) throw new Error('El slug es obligatorio.');

  const { data: duplicateSlug, error: duplicateError } = await supabase
    .from('news_articles')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', slug)
    .neq('id', articleId)
    .limit(1);

  if (duplicateError) throw duplicateError;
  if (duplicateSlug && duplicateSlug.length > 0) {
    throw new Error('Ya existe una noticia tuya con ese slug.');
  }

  const sourceUrl = validateSourceUrl(input.sourceUrl);
  const timestamp = nowIso();

  const { data, error } = await supabase
    .from('news_articles')
    .update({
      title: input.title.trim(),
      slug,
      source_url: sourceUrl,
      summary: input.summary.trim(),
      content: input.content.trim(),
      cover_image_url: input.coverImageUrl.trim(),
      category: input.category.trim(),
      tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
      status: input.status,
      scheduled_at: input.scheduledAt || null,
      published_at: resolvePublishedAt(input.status, previous.published_at),
      updated_at: timestamp,
    })
    .eq('id', articleId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;

  return mapRowToArticle(data as NewsArticleRow);
}

export async function deleteNewsArticle(_userEmail: string, articleId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error('No hay un usuario autenticado para eliminar noticias.');
  }

  const { data, error } = await supabase
    .from('news_articles')
    .delete()
    .eq('id', articleId)
    .eq('user_id', userId)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No se encontró la noticia solicitada.');
  }
}

export async function toggleNewsPublication(_userEmail: string, articleId: string): Promise<NewsArticle> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error('No hay un usuario autenticado para actualizar noticias.');
  }

  const { data: currentData, error: currentError } = await supabase
    .from('news_articles')
    .select('*')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (currentError || !currentData) {
    throw new Error('No se encontró la noticia solicitada.');
  }

  const current = currentData as NewsArticleRow;
  const nextStatus: NewsStatus = current.status === 'published' ? 'draft' : 'published';

  const { data, error } = await supabase
    .from('news_articles')
    .update({
      status: nextStatus,
      published_at: resolvePublishedAt(nextStatus, current.published_at),
      updated_at: nowIso(),
    })
    .eq('id', articleId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;

  return mapRowToArticle(data as NewsArticleRow);
}

export async function publishArticleNow(_userEmail: string, articleId: string): Promise<NewsArticle> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new Error('No hay un usuario autenticado para publicar noticias.');
  }

  const timestamp = nowIso();
  const { data, error } = await supabase
    .from('news_articles')
    .update({
      status: 'published',
      published_at: timestamp,
      updated_at: timestamp,
    })
    .eq('id', articleId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;

  return mapRowToArticle(data as NewsArticleRow);
}
