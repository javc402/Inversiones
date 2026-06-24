import { supabase } from '@lib/supabase';

/**
 * Servicio centralizado de auditoría
 * Detecta y registra cambios para cualquier tipo de entidad
 * Estándar para todos los módulos presentes y futuros
 */

export interface AuditChange {
  field: string;
  before: any;
  after: any;
}

export type AuditTargetType = 'account' | 'user' | 'config' | 'system';

interface AuditLogMetadata {
  source: 'frontend' | 'backend';
  module: string;
  targetType: AuditTargetType;
  targetId?: string;
  fieldsChanged: string[];
  changeDetails?: AuditChange[];
}

/**
 * Detecta todos los cambios entre datos anteriores y nuevos
 * @param beforeData Datos originales del registro
 * @param afterInput Datos nuevos a guardar
 * @param fieldsToCheck Array de nombres de campos a comparar
 * @returns Array de cambios detectados
 */
export function detectChanges(
  beforeData: any,
  afterInput: any,
  fieldsToCheck: string[]
): AuditChange[] {
  const changes: AuditChange[] = [];

  fieldsToCheck.forEach(field => {
    if (field in afterInput) {
      const before = beforeData?.[field];
      const after = afterInput[field] ?? null;

      if (before !== after) {
        changes.push({ field, before, after });
      }
    }
  });

  return changes;
}

/**
 * Registra actividad de auditoría con metadatos contextuales
 * @param action Acción realizada (ej: 'accounts.update', 'users.toggle_status')
 * @param metadata Metadatos incluyendo cambios detectados
 */
export async function logAuditActivity(
  action: string,
  metadata: Partial<AuditLogMetadata> & { [key: string]: any }
): Promise<void> {
  // Evita ruido en tests unitarios donde los mocks de supabase.from son limitados
  if (import.meta.env.MODE === 'test') return;

  // Obtener usuario actual
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Limpiar valores undefined
  const cleanMetadata = Object.entries(metadata).reduce(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, any>
  );

  // Agregar contexto de fronted si no está especificado
  if (!cleanMetadata.source) {
    cleanMetadata.source = 'frontend';
  }

  const { error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: user.id,
      action,
      target_user_id: metadata.targetUserId ?? null,
      metadata: cleanMetadata,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error logging audit activity:', error);
  }
}

/**
 * Helper: Registra cambios detectados de forma estándar
 * @param action Acción realizada
 * @param module Módulo que realiza la acción
 * @param targetType Tipo de entidad modificada
 * @param targetId ID de la entidad modificada
 * @param changes Array de cambios detectados
 * @param additionalMetadata Metadatos adicionales específicos del contexto
 */
export async function logChangesWithStandardFormat(
  action: string,
  module: string,
  targetType: AuditTargetType,
  targetId: string,
  changes: AuditChange[],
  additionalMetadata?: Record<string, any>
): Promise<void> {
  if (changes.length === 0) return;

  await logAuditActivity(action, {
    module,
    targetType,
    targetId,
    fieldsChanged: changes.map(c => c.field),
    changeDetails: changes.length > 0 ? changes : undefined,
    ...additionalMetadata,
  });
}
