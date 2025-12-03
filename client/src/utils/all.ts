import type { DialogueLine, Story, GeneratedStory } from '../common/types';
import { safe } from '.';
import { API_BASE } from '../config/consts';


export async function getStory(index: number): Promise<GeneratedStory> {
    const url = new URL("/story", API_BASE)
    const fetchResult = await safe<Response>(fetch(url))
    if (!fetchResult.success) {
        throw fetchResult.error
    }
    const jsonResult = await safe<GeneratedStory>(fetchResult.data.json())
    if (!jsonResult.success) {
        throw jsonResult.error
    }
    return jsonResult.data
}