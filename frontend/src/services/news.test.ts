import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: supabaseMocks.getUser,
    },
    from: supabaseMocks.from,
  },
}));

import {
  createNewsArticle,
  deleteNewsArticle,
  listUserNews,
  publishArticleNow,
  slugifyNewsTitle,
  toggleNewsPublication,
  updateNewsArticle,
} from '@services/news';

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'news-1',
    title: 'Titulo',
    slug: 'titulo',
    source_url: 'https://example.com/',
    summary: 'Resumen',
    content: 'Contenido',
    cover_image_url: '',
    category: 'Macro',
    tags: ['fed'],
    status: 'draft',
    scheduled_at: '2026-06-29T10:00:00.000Z',
    published_at: null,
    created_at: '2026-06-29T10:00:00.000Z',
    updated_at: '2026-06-29T10:00:00.000Z',
    ...overrides,
  };
}

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    title: ' Mi Titulo ',
    slug: ' mi titulo ',
    sourceUrl: 'https://example.com',
    summary: ' Resumen ',
    content: ' Contenido ',
    coverImageUrl: ' ',
    category: ' Macro ',
    tags: [' fed ', ''],
    status: 'draft',
    scheduledAt: '2026-06-29T10:00:00.000Z',
    ...overrides,
  };
}

describe('news service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('slugifyNewsTitle normaliza texto', () => {
    expect(slugifyNewsTitle('  Mi Titulo!!!  ')).toBe('mi-titulo');
  });

  it('listUserNews devuelve vacio sin usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const rows = await listUserNews('user@example.com');

    expect(rows).toEqual([]);
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it('listUserNews mapea filas correctamente', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockOrder = vi.fn().mockResolvedValueOnce({ data: [buildRow()], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    const rows = await listUserNews('user@example.com');

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('news-1');
    expect(rows[0].sourceUrl).toBe('https://example.com/');
  });

  it('listUserNews propaga error de BD', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockOrder = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('db') });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    await expect(listUserNews('user@example.com')).rejects.toThrow('db');
  });

  it('createNewsArticle valida campos obligatorios', async () => {
    await expect(createNewsArticle('user@example.com', buildInput({ title: ' ' }) as never)).rejects.toThrow('El título es obligatorio.');
    await expect(createNewsArticle('user@example.com', buildInput({ slug: ' ' }) as never)).rejects.toThrow('El slug es obligatorio.');
    await expect(createNewsArticle('user@example.com', buildInput({ summary: ' ' }) as never)).rejects.toThrow('El resumen es obligatorio.');
    await expect(createNewsArticle('user@example.com', buildInput({ content: ' ' }) as never)).rejects.toThrow('El contenido es obligatorio.');
    await expect(createNewsArticle('user@example.com', buildInput({ category: ' ' }) as never)).rejects.toThrow('La categoría es obligatoria.');
  });

  it('createNewsArticle valida URL de fuente', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockLimit = vi.fn().mockResolvedValueOnce({ data: [], error: null });
    const mockEqSlug = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqSlug });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    await expect(createNewsArticle('user@example.com', buildInput({ sourceUrl: '::::' }) as never)).rejects.toThrow('La URL de la fuente no es válida.');
  });

  it('createNewsArticle falla sin usuario autenticado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(createNewsArticle('user@example.com', buildInput() as never)).rejects.toThrow('No hay un usuario autenticado para crear noticias.');
  });

  it('createNewsArticle rechaza slug duplicado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockLimit = vi.fn().mockResolvedValueOnce({ data: [{ id: 'news-dup' }], error: null });
    const mockEqSlug = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqSlug });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    await expect(createNewsArticle('user@example.com', buildInput() as never)).rejects.toThrow('Ya existe una noticia tuya con ese slug.');
  });

  it('createNewsArticle crea noticia y limpia datos', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockLimit = vi.fn().mockResolvedValueOnce({ data: [], error: null });
    const mockEqSlug = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqSlug });
    const mockSelectDuplicate = vi.fn().mockReturnValue({ eq: mockEqUser });

    const mockSingle = vi.fn().mockResolvedValueOnce({ data: buildRow({ slug: 'mi-titulo' }), error: null });
    const mockInsertSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelectDuplicate })
      .mockReturnValueOnce({ insert: mockInsert });

    const created = await createNewsArticle('user@example.com', buildInput() as never);

    expect(created.slug).toBe('mi-titulo');
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('updateNewsArticle falla sin usuario', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(updateNewsArticle('user@example.com', 'news-1', buildInput() as never)).rejects.toThrow('No hay un usuario autenticado para actualizar noticias.');
  });

  it('updateNewsArticle falla si no existe noticia', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('not found') });
    const mockEqUser = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqId });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelect });

    await expect(updateNewsArticle('user@example.com', 'news-1', buildInput() as never)).rejects.toThrow('No se encontró la noticia solicitada.');
  });

  it('updateNewsArticle rechaza slug duplicado', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({ data: buildRow({ id: 'news-1' }), error: null });
    const mockEqUserFirst = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUserFirst });
    const mockSelectCurrent = vi.fn().mockReturnValue({ eq: mockEqId });

    const mockLimit = vi.fn().mockResolvedValueOnce({ data: [{ id: 'news-2' }], error: null });
    const mockNeq = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEqSlug = vi.fn().mockReturnValue({ neq: mockNeq });
    const mockEqUserSecond = vi.fn().mockReturnValue({ eq: mockEqSlug });
    const mockSelectDuplicate = vi.fn().mockReturnValue({ eq: mockEqUserSecond });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelectCurrent })
      .mockReturnValueOnce({ select: mockSelectDuplicate });

    await expect(updateNewsArticle('user@example.com', 'news-1', buildInput() as never)).rejects.toThrow('Ya existe una noticia tuya con ese slug.');
  });

  it('updateNewsArticle actualiza y mantiene publishedAt al publicar', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingleCurrent = vi.fn().mockResolvedValueOnce({ data: buildRow({ id: 'news-1', published_at: null }), error: null });
    const mockEqUserFirst = vi.fn().mockReturnValue({ single: mockSingleCurrent });
    const mockEqIdFirst = vi.fn().mockReturnValue({ eq: mockEqUserFirst });
    const mockSelectCurrent = vi.fn().mockReturnValue({ eq: mockEqIdFirst });

    const mockLimit = vi.fn().mockResolvedValueOnce({ data: [], error: null });
    const mockNeq = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEqSlug = vi.fn().mockReturnValue({ neq: mockNeq });
    const mockEqUserSecond = vi.fn().mockReturnValue({ eq: mockEqSlug });
    const mockSelectDuplicate = vi.fn().mockReturnValue({ eq: mockEqUserSecond });

    const mockSingleUpdated = vi.fn().mockResolvedValueOnce({ data: buildRow({ id: 'news-1', status: 'published', published_at: '2026-06-29T11:00:00.000Z' }), error: null });
    const mockEqUserUpdate = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingleUpdated }) });
    const mockEqIdUpdate = vi.fn().mockReturnValue({ eq: mockEqUserUpdate });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqIdUpdate });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelectCurrent })
      .mockReturnValueOnce({ select: mockSelectDuplicate })
      .mockReturnValueOnce({ update: mockUpdate });

    const updated = await updateNewsArticle('user@example.com', 'news-1', buildInput({ status: 'published' }) as never);
    expect(updated.status).toBe('published');
  });

  it('deleteNewsArticle falla sin usuario', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(deleteNewsArticle('user@example.com', 'news-1')).rejects.toThrow('No hay un usuario autenticado para eliminar noticias.');
  });

  it('deleteNewsArticle falla si no encuentra fila', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSelect = vi.fn().mockResolvedValueOnce({ data: [], error: null });
    const mockEqUser = vi.fn().mockReturnValue({ select: mockSelect });
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqId });
    supabaseMocks.from.mockReturnValueOnce({ delete: mockDelete });

    await expect(deleteNewsArticle('user@example.com', 'news-1')).rejects.toThrow('No se encontró la noticia solicitada.');
  });

  it('deleteNewsArticle elimina correctamente', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSelect = vi.fn().mockResolvedValueOnce({ data: [{ id: 'news-1' }], error: null });
    const mockEqUser = vi.fn().mockReturnValue({ select: mockSelect });
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEqId });
    supabaseMocks.from.mockReturnValueOnce({ delete: mockDelete });

    await expect(deleteNewsArticle('user@example.com', 'news-1')).resolves.toBeUndefined();
  });

  it('toggleNewsPublication alterna published -> draft', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingleCurrent = vi.fn().mockResolvedValueOnce({ data: buildRow({ status: 'published', published_at: '2026-06-29T11:00:00.000Z' }), error: null });
    const mockEqUserFirst = vi.fn().mockReturnValue({ single: mockSingleCurrent });
    const mockEqIdFirst = vi.fn().mockReturnValue({ eq: mockEqUserFirst });
    const mockSelectCurrent = vi.fn().mockReturnValue({ eq: mockEqIdFirst });

    const mockSingleUpdated = vi.fn().mockResolvedValueOnce({ data: buildRow({ status: 'draft', published_at: null }), error: null });
    const mockEqUserUpdate = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingleUpdated }) });
    const mockEqIdUpdate = vi.fn().mockReturnValue({ eq: mockEqUserUpdate });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqIdUpdate });

    supabaseMocks.from
      .mockReturnValueOnce({ select: mockSelectCurrent })
      .mockReturnValueOnce({ update: mockUpdate });

    const updated = await toggleNewsPublication('user@example.com', 'news-1');
    expect(updated.status).toBe('draft');
  });

  it('toggleNewsPublication falla cuando no existe noticia', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingleCurrent = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('not found') });
    const mockEqUserFirst = vi.fn().mockReturnValue({ single: mockSingleCurrent });
    const mockEqIdFirst = vi.fn().mockReturnValue({ eq: mockEqUserFirst });
    const mockSelectCurrent = vi.fn().mockReturnValue({ eq: mockEqIdFirst });
    supabaseMocks.from.mockReturnValueOnce({ select: mockSelectCurrent });

    await expect(toggleNewsPublication('user@example.com', 'news-1')).rejects.toThrow('No se encontró la noticia solicitada.');
  });

  it('publishArticleNow publica inmediatamente', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });

    const mockSingle = vi.fn().mockResolvedValueOnce({ data: buildRow({ status: 'published', published_at: '2026-06-29T11:00:00.000Z' }), error: null });
    const mockEqUser = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
    const mockEqId = vi.fn().mockReturnValue({ eq: mockEqUser });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqId });
    supabaseMocks.from.mockReturnValueOnce({ update: mockUpdate });

    const updated = await publishArticleNow('user@example.com', 'news-1');
    expect(updated.status).toBe('published');
  });

  it('publishArticleNow falla sin usuario', async () => {
    supabaseMocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(publishArticleNow('user@example.com', 'news-1')).rejects.toThrow('No hay un usuario autenticado para publicar noticias.');
  });
});
