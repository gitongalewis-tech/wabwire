import { SystemSetting } from '../models/index.js'

export async function setting(key, fallback) {
  const record = await SystemSetting.findOne({ key }).lean()
  return record?.value ?? fallback
}

export async function saveSetting(key, value, actor) {
  return SystemSetting.findOneAndUpdate({ key }, { value, updatedBy: actor }, { upsert: true, new: true })
}
