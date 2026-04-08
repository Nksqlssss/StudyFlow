import { subjects } from '$lib/stores/subjects'
import { error } from '@sveltejs/kit'
import { get } from 'svelte/store'

export function load({ params }) {
  const allSubjects = get(subjects);
  const subject = allSubjects.find(s => s.id === params.id);

  if (!subject) {
    error(404, 'Предмет не найден');
  }

  return { subject };
}