import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  if (status === 'draft') return 'Borrador';
  if (status === 'scheduled') return 'Programada';
  return 'Publicada';
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

function NewsFieldLabel({ text, help }: Readonly<{ text: string; help: string }>) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  function updatePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverWidth = 260;
    const viewportPadding = 12;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - popoverWidth - viewportPadding));

    setPopoverPos({
      top: rect.bottom + 10,
      left,
    });
  }

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handleViewportChange = () => updatePosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <span className="news-field-label">
      {text}
      <button
        type="button"
        className="news-help-trigger"
        aria-label={`Ayuda: ${text}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        ref={triggerRef}
      >
        ?
      </button>
      {open &&
        createPortal(
          <div
            className="news-help-popover is-open"
            role="tooltip"
            style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
            ref={popoverRef}
          >
            {help}
          </div>,
          document.body
        )}
    </span>
  );
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
          <button
            type="button"
            className="news-action-btn news-action-btn-icon"
            onClick={() => onEdit(article)}
            aria-label="Editar noticia"
            title="Editar noticia"
          >
            <AppIcon name="edit" />
          </button>
          <button
            type="button"
            className="news-action-btn news-action-btn-icon"
            onClick={() => onTogglePublish(article)}
            aria-label={article.status === 'published' ? 'Despublicar noticia' : 'Publicar noticia'}
            title={article.status === 'published' ? 'Despublicar noticia' : 'Publicar noticia'}
          >
            <AppIcon name={article.status === 'published' ? 'power' : 'play'} />
          </button>
          <button
            type="button"
            className="news-action-btn news-action-btn-soft news-action-btn-icon"
            onClick={() => onPublishNow(article)}
            aria-label="Publicar ahora"
            title="Publicar ahora"
          >
            <AppIcon name="check" />
          </button>
          <button
            type="button"
            className="news-action-btn news-action-btn-danger news-action-btn-icon"
            onClick={() => onDelete(article)}
            aria-label="Eliminar noticia"
            title="Eliminar noticia"
          >
            <AppIcon name="delete" />
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
    let isMounted = true;

    async function loadArticles() {
      try {
        const loaded = await listUserNews(userEmail);
        if (!isMounted) return;
        setArticles(loaded);
      } catch {
        if (!isMounted) return;
        setArticles([]);
        setError('No se pudieron cargar las noticias desde la base de datos.');
      }
    }

    void loadArticles();

    return () => {
      isMounted = false;
    };
  }, [userEmail]);

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
        await createNewsArticle(userEmail, payload);
      } else if (editingArticle) {
        await updateNewsArticle(userEmail, editingArticle.id, payload);
      }

      setArticles(await listUserNews(userEmail));
      setSuccess(modalMode === 'create' ? 'Noticia creada correctamente.' : 'Noticia actualizada correctamente.');
      closeModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar la noticia.');
    }
  }

  async function handleDelete(article: NewsArticle) {
    if (!globalThis.confirm(`Eliminar la noticia "${article.title}"?`)) return;

    try {
      await deleteNewsArticle(userEmail, article.id);
      setArticles(await listUserNews(userEmail));
      setSuccess('Noticia eliminada.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la noticia.');
    }
  }

  async function handleTogglePublish(article: NewsArticle) {
    try {
      await toggleNewsPublication(userEmail, article.id);
      setArticles(await listUserNews(userEmail));
      setSuccess(article.status === 'published' ? 'Noticia despublicada.' : 'Noticia publicada.');
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'No se pudo cambiar el estado.');
    }
  }

  async function handlePublishNow(article: NewsArticle) {
    try {
      await publishArticleNow(userEmail, article.id);
      setArticles(await listUserNews(userEmail));
      setSuccess('Noticia publicada ahora.');
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'No se pudo publicar la noticia.');
    }
  }

  const modal = modalMode
    ? createPortal(
        <div className="news-modal-overlay">
          <dialog className="news-modal-shell" open aria-labelledby="news-modal-title">
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
                <NewsFieldLabel text="Titulo" help="Encabezado principal que identifica la noticia en listados y reportes." />
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
                <NewsFieldLabel text="Slug" help="Identificador corto único para URLs y referencias históricas." />
                <input value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} placeholder="mi-noticia" required />
              </label>

              <label className="news-form-span-2">
                <NewsFieldLabel text="URL de la fuente" help="Enlace de origen de la información para trazabilidad." />
                <input
                  value={form.sourceUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))}
                  placeholder="https://..."
                  required
                />
              </label>

              <label className="news-form-span-2">
                <NewsFieldLabel text="Resumen" help="Descripción breve para vista rápida de la noticia." />
                <textarea
                  value={form.summary}
                  onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
                  rows={3}
                  required
                />
              </label>

              <label className="news-form-span-2">
                <NewsFieldLabel text="Contenido" help="Desarrollo completo de la noticia para consulta histórica." />
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  rows={8}
                  required
                />
              </label>

              <label>
                <NewsFieldLabel text="Imagen destacada" help="URL de imagen principal para la card de la noticia." />
                <input
                  value={form.coverImageUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </label>

              <label>
                <NewsFieldLabel text="Categoria" help="Clasificación temática para filtros y reportes." />
                <input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
              </label>

              <label>
                <NewsFieldLabel text="Etiquetas" help="Palabras clave separadas por coma para agrupar noticias." />
                <input
                  value={form.tagsText}
                  onChange={(event) => setForm((prev) => ({ ...prev, tagsText: event.target.value }))}
                  placeholder="trading, mercados, crypto"
                />
              </label>

              <label>
                <NewsFieldLabel text="Estado" help="Situación editorial de la noticia: borrador, programada o publicada." />
                <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as NewsStatus }))}>
                  <option value="draft">Borrador</option>
                  <option value="scheduled">Programada</option>
                  <option value="published">Publicada</option>
                </select>
              </label>

              <label>
                <NewsFieldLabel text="Programar publicacion" help="Fecha y hora para publicación automática si aplica." />
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
          </dialog>
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
