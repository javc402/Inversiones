import { render, screen } from '@testing-library/react';
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
    vi.mocked(newsService.seedNewsForUser).mockImplementation(() => {});
    vi.mocked(newsService.listUserNews).mockReturnValue([]);
  });

  it('should render the module', () => {
    render(<NewsModule userEmail="test@example.com" />);
    expect(screen.getByText('Mis noticias')).toBeInTheDocument();
  });

  it('should seed data on mount', () => {
    render(<NewsModule userEmail="test@example.com" />);
    expect(vi.mocked(newsService.seedNewsForUser)).toHaveBeenCalled();
  });

  it('should show empty state', () => {
    render(<NewsModule userEmail="test@example.com" />);
    expect(screen.getByText('No tienes noticias todavía')).toBeInTheDocument();
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

  it('should display articles when available', () => {
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
    vi.mocked(newsService.listUserNews).mockReturnValue([article]);
    render(<NewsModule userEmail="test@example.com" />);
    expect(screen.getByText('Test Article')).toBeInTheDocument();
  });

  it('should show draft status', () => {
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
    vi.mocked(newsService.listUserNews).mockReturnValue([article]);
    render(<NewsModule userEmail="test@example.com" />);
    expect(screen.getAllByText('Borrador').length).toBeGreaterThan(0);
  });

  it('should show published status', () => {
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
    vi.mocked(newsService.listUserNews).mockReturnValue([article]);
    render(<NewsModule userEmail="test@example.com" />);
    expect(screen.getAllByText('Publicada').length).toBeGreaterThan(0);
  });

  it('should display multiple articles', () => {
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
    vi.mocked(newsService.listUserNews).mockReturnValue(articles);
    render(<NewsModule userEmail="test@example.com" />);
    expect(screen.getByText('Article 1')).toBeInTheDocument();
    expect(screen.getByText('Article 2')).toBeInTheDocument();
  });

  it('should show category', () => {
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
    vi.mocked(newsService.listUserNews).mockReturnValue([article]);
    render(<NewsModule userEmail="test@example.com" />);
    expect(screen.getByText('Tecnología')).toBeInTheDocument();
  });

  it('should accept userEmail prop', () => {
    render(<NewsModule userEmail="custom@test.com" />);
    expect(vi.mocked(newsService.seedNewsForUser)).toHaveBeenCalledWith('custom@test.com');
  });
});
