import { hasApiCode, hasApiStatus, isApiError } from '@/api/error';

export function isGraphConflict(error: unknown): boolean {
  return hasApiCode(error, 'GRAPH_VERSION_CONFLICT') || hasApiStatus(error, 412);
}

export function messageForApiError(error: unknown, fallback: string): string {
  if (!isApiError(error)) {
    return fallback;
  }
  switch (error.code) {
    case 'GRAPH_VERSION_CONFLICT':
      return 'Граф на сервере новее. Локальные правки сохранены здесь. Можно перечитать серверную версию.';
    case 'PRECONDITION_REQUIRED':
      return 'Не передан If-Match. Обновите страницу.';
    case 'INCOMPLETE_CHAIN':
      return 'Для запуска нужны непустой текст, генератор и связанный результат.';
    case 'GENERATOR_REQUIRED':
      return 'Запускать генерацию можно только с ноды генератора.';
    case 'GENERATION_IN_PROGRESS':
      return 'Эта нода уже генерирует изображение. Дождитесь окончания.';
    case 'GRAPH_CHANGED':
      return 'Версия графа устарела. Дождитесь сохранения и запустите снова.';
    case 'SPACE_NOT_FOUND':
      return 'Пространство не найдено. Создайте новое с главной страницы.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'Повтор запроса с тем же ключом, но другим телом. Запустите генерацию заново.';
    default:
      return error.message || fallback;
  }
}
