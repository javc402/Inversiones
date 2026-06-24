import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppIcon } from './AppIcon';
import {
  createNewsArticle,
  deleteNewsArticle,
  listUserNews,
  NewsArticle,
  NewsArticleInput,
  NewsStatus,
  publishArticleNow,
  seedNewsForUser,
  slugifyNewsTitle,
  toggleNewsPublication,
  updateNewsArticle,
} from '@services/news';
import '../styles/news-module.css';

type ModalMode = 'create' | 'edit';

interface NewsModuleProps {
  userEmail: string;
}

interface NewsFormState extends Omit<NewsArticleInput, 'tags'> {
  tagsText: string;
}

const emptyForm: NewsFormState = {
  title: '',
  slug: '',
  sourceUrl: '',
  summary: '',
  content: '',
  coverImageUrl: '',
  category: 'Mercados',
  status: 'draft',
  scheduledAt: '',
  tagsText: '',
};

function statusLabel(status: NewsStatus): string {
  return status === 'draft' ? 'Borrador' : status === 'scheduled' ? 'Programada' : 'Publicada';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function NewsCard({ article, onEdit, onDelete, onTogglePublish, onPublishNow }: Readonly<{
  article: NewsArticle;
  onEdit: (article: NewsArticle) => void;
  onDelete: (article: NewsArticle) => void;
  onTogglePublish: (article: NewsArticle) => void;
  onPublishNow: (article: NewsArticle) => void;
}>) {
  return (
    <article className="news-card">
      <div className="news-card-cover">
        {article.coverImageUrl ? <img src={article.coverImageUrl} alt={article.title} /> : <span>IN</span>}
      </div>
      <div className="news-card-body">
        <div className="news-card-topline">
          <span className={`news-status-chip news-status-${article.status}`}>{statusLabel(article.status)}</span>
          <span className="news-category-chip">{article.category}</span>
        </div>
        <h3>{article.title}</h3>
        <p className="news-summary">{article.summary}</p>
        <div className="news-meta">
          <span>{formatDate(article.updatedAt)}</span>
          {article.sourceUrl ? (
            <a href={article.sourceUrl} target="_blank" rel="noreferrer">
              Fuente
            </a>
          ) : (
            <span>Sin fuente</span>
          )}
        </div>
        <div className="news-tag-row">
          {article.tags.map((tag) => (
            <span key={tag} className="news-tag-pill">
              #{tag}
            </span>
          ))}
        </div>
        <div className="news-card-actions">
          <button type="button" className="news-action-btn" onClick={() => onEdit(article)}>
            <AppIcon name="edit" />
            Editar
          </button>
          <button type="button" className="news-action-btn" onClick={() => onTogglePublish(article)}>
            <AppIcon name={article.status === 'published' ? 'power' : 'play'} />
            {article.status === 'published' ? 'Despublicar' : 'Publicar'}
          </button>
          <button type="button" className="news-action-btn news-action-btn-soft" onClick={() => onPublishNow(article)}>
            <AppIcon name="check" />
            Publicar ahora
          </button>
          <button type="button" className="news-action-btn news-action-btn-danger" onClick={() => onDelete(article)}>
            <AppIcon name="delete" />
            Eliminar
          </button>
        </div>
      </div>
    </article>
  );
}

export default function NewsModule({ userEmail }: Readonly<NewsModuleProps>) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | NewsStatus>('all');
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<NewsFormState>(emptyForm);

  useEffect(() => {
    seedNewsForUser(userEmail);
    setArticles(listUserNews(userEmail));
  }, [userEmail]);

  useEffect(() => {
    setArticles(listUserNews(userEmail));
  }, [userEmail, success]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesQuery =
        !query ||
        article.title.toLowerCase().includes(query.toLowerCase()) ||
        article.summary.toLowerCase().includes(query.toLowerCase()) ||
        article.category.toLowerCase().includes(query.toLowerCase());

      const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [articles, query, statusFilter]);

  function openCreateModal() {
    setModalMode('create');
    setEditingArticle(null);
    setForm(emptyForm);
    setError('');
    setSuccess('');
  }

  function openEditModal(article: NewsArticle) {
    setModalMode('edit');
    setEditingArticle(article);
    setForm({
      title: article.title,
      slug: article.slug,
      sourceUrl: article.sourceUrl,
      summary: article.summary,
      content: article.content,
      coverImageUrl: article.coverImageUrl,
      category: article.category,
      tagsText: article.tags.join(', '),
      status: article.status,
      scheduledAt: article.scheduledAt,
    });
    setError('');
    setSuccess('');
  }

  function closeModal() {
    setModalMode(null);
    setEditingArticle(null);
    setError('');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      const payload: NewsArticleInput = {
        title: form.title,
        slug: form.slug || slugifyNewsTitle(form.title),
        sourceUrl: form.sourceUrl,
        summary: form.summary,
        content: form.content,
        coverImageUrl: form.coverImageUrl,
        category: form.category,
        tags: splitTags(form.tagsText),
        status: form.status,
        scheduledAt: form.scheduledAt,
      };

      if (modalMode === 'create') {
        createNewsArticle(userEmail, payload);
      } else if (editingArticle) {
        updateNewsArticle(userEmail, editingArticle.id, payload);
      }

      setArticles(listUserNews(userEmail));
      setSuccess(modalMode === 'create' ? 'Noticia creada correctamente.' : 'Noticia actualizada correctamente.');
      closeModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar la noticia.');
    }
  }

  function handleDelete(article: NewsArticle) {
    if (!window.confirm(`Eliminar la noticia "${article.title}"?`)) return;

    try {
      deleteNewsArticle(userEmail, article.id);
      setArticles(listUserNews(userEmail));
      setSuccess('Noticia eliminada.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la noticia.');
    }
  }

  function handleTogglePublish(article: NewsArticle) {
    try {
      toggleNewsPublication(userEmail, article.id);
      setArticles(listUserNews(userEmail));
      setSuccess(article.status === 'published' ? 'Noticia despublicada.' : 'Noticia publicada.');
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'No se pudo cambiar el estado.');
    }
  }

  function handlePublishNow(article: NewsArticle) {
    try {
      publishArticleNow(userEmail, article.id);
      setArticles(listUserNews(userEmail));
      setSuccess('Noticia publicada ahora.');
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'No se pudo publicar la noticia.');
    }
  }

  const modal = modalMode
    ? createPortal(
        <div className="news-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="news-modal-title">
          <div className="news-modal-shell">
            <div className="news-modal-header">
              <div>
                <p className="news-modal-kicker">Gestión de noticias</p>
                <h2 id="news-modal-title">{modalMode === 'create' ? 'Nueva noticia' : 'Editar noticia'}</h2>
              </div>
              <button type="button" className="news-modal-close" onClick={closeModal}>
                <AppIcon name="delete" />
              </button>
            </div>

            <form className="news-form" onSubmit={handleSubmit}>
              <label>
                <span>Título</span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                      slug: prev.slug || slugifyNewsTitle(event.target.value),
                    }))
                  }
                  placeholder="Ej. Mercado abre con sesgo alcista"
                  required
                />
              </label>

              <label>
                <span>Slug</span>
                <input value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} placeholder="mi-noticia" required />
              </label>

              <label className="news-form-span-2">
                <span>URL de la fuente</span>
                <input
                  value={form.sourceUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))}
                  placeholder="https://..."
                  required
                />
              </label>

              <label className="news-form-span-2">
                <span>Resumen</span>
                <textarea
                  value={form.summary}
                  onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
                  rows={3}
                  required
                />
              </label>

              <label className="news-form-span-2">
                <span>Contenido</span>
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  rows={8}
                  required
                />
              </label>

              <label>
                <span>Imagen destacada</span>
                <input
                  value={form.coverImageUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>

              <label>
                <span>Categoría</span>
                <input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
              </label>

              <label>
                <span>Etiquetas</span>
                <input
                  value={form.tagsText}
                  onChange={(event) => setForm((prev) => ({ ...prev, tagsText: event.target.value }))}
                  placeholder="trading, mercados, crypto"
                />
              </label>

              <label>
                <span>Estado</span>
                <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as NewsStatus }))}>
                  <option value="draft">Borrador</option>
                  <option value="scheduled">Programada</option>
                  <option value="published">Publicada</option>
                </select>
              </label>

              <label>
                <span>Programar publicación</span>
                <input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))} />
              </label>

              {error && <p className="news-form-error">{error}</p>}

              <div className="news-form-actions news-form-span-2">
                <button type="button" className="secondary-btn" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="primary-btn">
                  {modalMode === 'create' ? 'Guardar noticia' : 'Actualizar noticia'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <section className="news-module">
      <header className="news-hero">
        <div>
          <p className="news-hero-kicker">Publicación propia</p>
          <h2>Mis noticias</h2>
          <p>Solo ves y gestionas las noticias creadas con tu correo: <strong>{userEmail}</strong>.</p>
        </div>
        <button type="button" className="primary-btn news-create-btn" onClick={openCreateModal}>
          <AppIcon name="edit" />
          Nueva noticia
        </button>
      </header>

      <div className="news-toolbar">
        <input className="news-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, resumen o categoría" />
        <select className="news-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | NewsStatus)}>
          <option value="all">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="scheduled">Programada</option>
          <option value="published">Publicada</option>
        </select>
      </div>

      {error && <p className="news-alert news-alert-error">{error}</p>}
      {success && <p className="news-alert news-alert-success">{success}</p>}

      {filteredArticles.length === 0 ? (
        <section className="news-empty">
          <h3>No tienes noticias todavía</h3>
          <p>Crea tu primera noticia para empezar a publicarla desde tu espacio privado.</p>
        </section>
      ) : (
        <div className="news-grid">
          {filteredArticles.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onTogglePublish={handleTogglePublish}
              onPublishNow={handlePublishNow}
            />
          ))}
        </div>
      )}

      {modal}
    </section>
  );
}
