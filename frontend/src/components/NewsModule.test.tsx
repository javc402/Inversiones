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
});
