import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import NewsModule from './NewsModule';
import * as newsService from '@services/news';

vi.mock('@services/news');
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return { ...actual, createPortal: (el: React.ReactNode) => el };
});

describe('NewsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(newsService.listUserNews).mockResolvedValue([]);
  });

  it('should render the module', () => {
    render(<NewsModule userEmail="test@example.com" />);
    expect(screen.getByText('Mis noticias')).toBeInTheDocument();
  });

  it('should show empty state', async () => {
    render(<NewsModule userEmail="test@example.com" />);
    expect(await screen.findByText('No tienes noticias todavía')).toBeInTheDocument();
  });

  it('should have search functionality', () => {
    render(<NewsModule userEmail="test@example.com" />);
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
  });

  it('should have create button', () => {
    render(<NewsModule userEmail="test@example.com" />);
    expect(screen.getByRole('button', { name: /Nueva noticia/i })).toBeInTheDocument();
  });

  it('should have status filter', () => {
    render(<NewsModule userEmail="test@example.com" />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should display articles when available', async () => {
    const article = {
      id: 'n1',
      userEmail: 'test@example.com',
      title: 'Test Article',
      slug: 'test',
      sourceUrl: 'https://test.com',
      summary: 'Test',
      content: 'Content',
      coverImageUrl: '',
      category: 'Mercados',
      tags: [],
      status: 'draft' as const,
      scheduledAt: '',
      publishedAt: null,
      createdAt: '2026-06-24T10:00:00Z',
      updatedAt: '2026-06-24T10:00:00Z',
    };
    vi.mocked(newsService.listUserNews).mockResolvedValue([article]);
    render(<NewsModule userEmail="test@example.com" />);
    expect(await screen.findByText('Test Article')).toBeInTheDocument();
  });

  it('should show draft status', async () => {
    const article = {
      id: 'n1',
      userEmail: 'test@example.com',
      title: 'Article',
      slug: 'article',
      sourceUrl: 'https://test.com',
      summary: 'Summary',
      content: 'Content',
      coverImageUrl: '',
      category: 'Mercados',
      tags: [],
      status: 'draft' as const,
      scheduledAt: '',
      publishedAt: null,
      createdAt: '2026-06-24T10:00:00Z',
      updatedAt: '2026-06-24T10:00:00Z',
    };
    vi.mocked(newsService.listUserNews).mockResolvedValue([article]);
    render(<NewsModule userEmail="test@example.com" />);
    expect((await screen.findAllByText('Borrador')).length).toBeGreaterThan(0);
  });

  it('should show published status', async () => {
    const article = {
      id: 'n1',
      userEmail: 'test@example.com',
      title: 'Article',
      slug: 'article',
      sourceUrl: 'https://test.com',
      summary: 'Summary',
      content: 'Content',
      coverImageUrl: '',
      category: 'Mercados',
      tags: [],
      status: 'published' as const,
      scheduledAt: '',
      publishedAt: '2026-06-24T10:00:00Z',
      createdAt: '2026-06-24T10:00:00Z',
      updatedAt: '2026-06-24T10:00:00Z',
    };
    vi.mocked(newsService.listUserNews).mockResolvedValue([article]);
    render(<NewsModule userEmail="test@example.com" />);
    expect((await screen.findAllByText('Publicada')).length).toBeGreaterThan(0);
  });

  it('should display multiple articles', async () => {
    const articles = [
      {
        id: 'n1',
        userEmail: 'test@example.com',
        title: 'Article 1',
        slug: 'article-1',
        sourceUrl: 'https://test.com',
        summary: 'Summary 1',
        content: 'Content 1',
        coverImageUrl: '',
        category: 'Mercados',
        tags: [],
        status: 'draft' as const,
        scheduledAt: '',
        publishedAt: null,
        createdAt: '2026-06-24T10:00:00Z',
        updatedAt: '2026-06-24T10:00:00Z',
      },
      {
        id: 'n2',
        userEmail: 'test@example.com',
        title: 'Article 2',
        slug: 'article-2',
        sourceUrl: 'https://test.com',
        summary: 'Summary 2',
        content: 'Content 2',
        coverImageUrl: '',
        category: 'Cripto',
        tags: [],
        status: 'published' as const,
        scheduledAt: '',
        publishedAt: '2026-06-24T10:00:00Z',
        createdAt: '2026-06-24T09:00:00Z',
        updatedAt: '2026-06-24T09:00:00Z',
      },
    ];
    vi.mocked(newsService.listUserNews).mockResolvedValue(articles);
    render(<NewsModule userEmail="test@example.com" />);
    expect(await screen.findByText('Article 1')).toBeInTheDocument();
    expect(await screen.findByText('Article 2')).toBeInTheDocument();
  });

  it('should show category', async () => {
    const article = {
      id: 'n1',
      userEmail: 'test@example.com',
      title: 'Article',
      slug: 'article',
      sourceUrl: 'https://test.com',
      summary: 'Summary',
      content: 'Content',
      coverImageUrl: '',
      category: 'Tecnología',
      tags: [],
      status: 'draft' as const,
      scheduledAt: '',
      publishedAt: null,
      createdAt: '2026-06-24T10:00:00Z',
      updatedAt: '2026-06-24T10:00:00Z',
    };
    vi.mocked(newsService.listUserNews).mockResolvedValue([article]);
    render(<NewsModule userEmail="test@example.com" />);
    expect(await screen.findByText('Tecnología')).toBeInTheDocument();
  });

  it('should accept userEmail prop', async () => {
    render(<NewsModule userEmail="custom@test.com" />);
    expect(await screen.findByText('Mis noticias')).toBeInTheDocument();
  });

  it('should show error when loading fails', async () => {
    vi.mocked(newsService.listUserNews).mockRejectedValueOnce(new Error('Load failed'));

    render(<NewsModule userEmail="test@example.com" />);

    expect(await screen.findByText('No se pudieron cargar las noticias desde la base de datos.')).toBeInTheDocument();
  });

  it('should open and close create modal', async () => {
    render(<NewsModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva noticia/i }));
    expect(screen.getByRole('heading', { name: 'Nueva noticia' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Nueva noticia' })).not.toBeInTheDocument();
    });
  });

  it('should create article successfully', async () => {
    vi.mocked(newsService.createNewsArticle).mockResolvedValueOnce(undefined as never);
    vi.mocked(newsService.listUserNews)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'n1',
          userEmail: 'test@example.com',
          title: 'Creada',
          slug: 'creada',
          sourceUrl: 'https://test.com',
          summary: 'Summary',
          content: 'Content',
          coverImageUrl: '',
          category: 'Mercados',
          tags: ['fed'],
          status: 'draft',
          scheduledAt: '',
          publishedAt: null,
          createdAt: '2026-06-24T10:00:00Z',
          updatedAt: '2026-06-24T10:00:00Z',
        },
      ] as never);

    render(<NewsModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: /Nueva noticia/i }));

    fireEvent.change(screen.getByPlaceholderText('Ej. Mercado abre con sesgo alcista'), { target: { value: 'Articulo nuevo' } });
    fireEvent.change(screen.getByPlaceholderText('mi-noticia'), { target: { value: 'articulo-nuevo' } });
    fireEvent.change(screen.getAllByPlaceholderText('https://...')[0], { target: { value: 'https://source.com' } });
    const textareas = screen.getAllByRole('textbox').filter((el) => el.tagName.toLowerCase() === 'textarea');
    fireEvent.change(textareas[0], { target: { value: 'Resumen prueba' } });
    fireEvent.change(textareas[1], { target: { value: 'Contenido prueba' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar noticia' }));

    await waitFor(() => {
      expect(newsService.createNewsArticle).toHaveBeenCalled();
    });
  });

  it('should open edit modal and update article', async () => {
    const article = {
      id: 'n1',
      userEmail: 'test@example.com',
      title: 'Article',
      slug: 'article',
      sourceUrl: 'https://test.com',
      summary: 'Summary',
      content: 'Content',
      coverImageUrl: '',
      category: 'Mercados',
      tags: ['macro'],
      status: 'draft' as const,
      scheduledAt: '',
      publishedAt: null,
      createdAt: '2026-06-24T10:00:00Z',
      updatedAt: '2026-06-24T10:00:00Z',
    };
    vi.mocked(newsService.listUserNews).mockResolvedValue([article]);
    vi.mocked(newsService.updateNewsArticle).mockResolvedValueOnce(undefined as never);

    render(<NewsModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Editar noticia' }));
    expect(screen.getByText('Editar noticia')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('mi-noticia'), { target: { value: 'article-updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar noticia' }));

    await waitFor(() => {
      expect(newsService.updateNewsArticle).toHaveBeenCalled();
    });
  });

  it('should filter by query and status', async () => {
    const articles = [
      {
        id: 'n1',
        userEmail: 'test@example.com',
        title: 'Macro semanal',
        slug: 'macro',
        sourceUrl: 'https://test.com',
        summary: 'Summary',
        content: 'Content',
        coverImageUrl: '',
        category: 'Mercados',
        tags: [],
        status: 'draft' as const,
        scheduledAt: '',
        publishedAt: null,
        createdAt: '2026-06-24T10:00:00Z',
        updatedAt: '2026-06-24T10:00:00Z',
      },
      {
        id: 'n2',
        userEmail: 'test@example.com',
        title: 'Cripto al alza',
        slug: 'cripto',
        sourceUrl: 'https://test.com',
        summary: 'Summary',
        content: 'Content',
        coverImageUrl: '',
        category: 'Cripto',
        tags: [],
        status: 'published' as const,
        scheduledAt: '',
        publishedAt: '2026-06-24T10:00:00Z',
        createdAt: '2026-06-24T10:00:00Z',
        updatedAt: '2026-06-24T10:00:00Z',
      },
    ];
    vi.mocked(newsService.listUserNews).mockResolvedValue(articles);

    render(<NewsModule userEmail="test@example.com" />);
    expect(await screen.findByText('Macro semanal')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Buscar/i), { target: { value: 'Cripto' } });
    expect(screen.queryByText('Macro semanal')).not.toBeInTheDocument();
    expect(screen.getByText('Cripto al alza')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'draft' } });
    expect(screen.queryByText('Cripto al alza')).not.toBeInTheDocument();
  });

  it('should toggle publication and publish now', async () => {
    const article = {
      id: 'n1',
      userEmail: 'test@example.com',
      title: 'Article',
      slug: 'article',
      sourceUrl: 'https://test.com',
      summary: 'Summary',
      content: 'Content',
      coverImageUrl: '',
      category: 'Mercados',
      tags: [],
      status: 'draft' as const,
      scheduledAt: '',
      publishedAt: null,
      createdAt: '2026-06-24T10:00:00Z',
      updatedAt: '2026-06-24T10:00:00Z',
    };
    vi.mocked(newsService.listUserNews).mockResolvedValue([article]);
    vi.mocked(newsService.toggleNewsPublication).mockResolvedValueOnce(undefined as never);
    vi.mocked(newsService.publishArticleNow).mockResolvedValueOnce(undefined as never);

    render(<NewsModule userEmail="test@example.com" />);

    const toggleBtn = await screen.findByRole('button', { name: 'Publicar noticia' });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(newsService.toggleNewsPublication).toHaveBeenCalled();
    });

    const publishNowBtn = screen.getByRole('button', { name: 'Publicar ahora' });
    fireEvent.click(publishNowBtn);

    await waitFor(() => {
      expect(newsService.publishArticleNow).toHaveBeenCalled();
    });
  });

  it('should delete article when confirmed', async () => {
    const article = {
      id: 'n1',
      userEmail: 'test@example.com',
      title: 'Article',
      slug: 'article',
      sourceUrl: 'https://test.com',
      summary: 'Summary',
      content: 'Content',
      coverImageUrl: '',
      category: 'Mercados',
      tags: [],
      status: 'draft' as const,
      scheduledAt: '',
      publishedAt: null,
      createdAt: '2026-06-24T10:00:00Z',
      updatedAt: '2026-06-24T10:00:00Z',
    };
    vi.mocked(newsService.listUserNews).mockResolvedValue([article]);
    vi.mocked(newsService.deleteNewsArticle).mockResolvedValueOnce(undefined as never);
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

    render(<NewsModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar noticia' }));

    await waitFor(() => {
      expect(newsService.deleteNewsArticle).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('should not delete article when confirm is cancelled', async () => {
    const article = {
      id: 'n1',
      userEmail: 'test@example.com',
      title: 'Article',
      slug: 'article',
      sourceUrl: 'https://test.com',
      summary: 'Summary',
      content: 'Content',
      coverImageUrl: '',
      category: 'Mercados',
      tags: [],
      status: 'draft' as const,
      scheduledAt: '',
      publishedAt: null,
      createdAt: '2026-06-24T10:00:00Z',
      updatedAt: '2026-06-24T10:00:00Z',
    };
    vi.mocked(newsService.listUserNews).mockResolvedValue([article]);
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

    render(<NewsModule userEmail="test@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar noticia' }));
    expect(newsService.deleteNewsArticle).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should show help popover and close with Escape', async () => {
    render(<NewsModule userEmail="test@example.com" />);
    fireEvent.click(await screen.findByRole('button', { name: /Nueva noticia/i }));

    const helpBtn = screen.getByRole('button', { name: 'Ayuda: Titulo' });
    fireEvent.click(helpBtn);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });
});
