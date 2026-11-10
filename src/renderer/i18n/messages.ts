import type { AppLanguage } from '@shared/types';

/**
 * 界面文案表。主进程只返回稳定的错误码 / 提示码，所有面向用户的文字都在这里，
 * 这样新增语言只需要增加一份字典。
 */
const zhCN = {
  // 通用
  'common.lock': '锁定',
  'common.save': '保存',
  'common.cancel': '取消',
  'common.close': '关闭',
  'common.copy': '复制',

  // 导航
  'nav.workbench': '工作台',
  'nav.settings': '设置',
  'nav.backToWorkbench': '返回工作台',
  'nav.back': '返回',

  // 初始化
  'setup.title': '创建 {app} 密码库',
  'setup.master': '主密码',
  'setup.masterRequired': '请输入主密码',
  'setup.confirm': '确认主密码',
  'setup.confirmRequired': '请再次输入主密码',
  'setup.mismatch': '两次输入的主密码不一致',
  'setup.submit': '创建密码库',
  'setup.help':
    '主密码至少 {min} 个字符，允许空格和较长口令。忘记主密码后，已有的加密备份也无法直接解密，本工具不提供主密码找回。',

  // 解锁
  'unlock.title': '解锁 {app}',
  'unlock.master': '主密码',
  'unlock.masterRequired': '请输入主密码',
  'unlock.submit': '解锁',

  // 密码生成器
  'generator.title': '密码生成器',
  'generator.hintShort': '8–20 位 · 可配置字符类型',
  'generator.description':
    '使用系统安全随机数生成 {min}-{max} 位密码，未保存的结果不会写入磁盘。',
  'generator.rulesCard': '生成规则',
  'generator.resultCard': '生成结果',
  'generator.length': '密码长度：{length}',
  'generator.lengthShort': '长度',
  'generator.lengthInput': '直接输入长度',
  'generator.classes': '字符类型',
  'generator.uppercase': '大写字母',
  'generator.lowercase': '小写字母',
  'generator.numbers': '数字',
  'generator.symbols': '特殊符号',
  'generator.excludeAmbiguous': '排除易混淆字符（0/O、1/l/I）',
  'generator.excludeAmbiguousShort': '排除易混淆字符',
  'generator.placeholder': '点击生成按钮创建密码',
  'generator.copy': '复制',
  'generator.regenerate': '重新生成',
  'generator.save': '保存',
  'generator.copied': '已复制，稍后将自动清理剪贴板',
  'generator.saved': '已保存到密码库',
  'generator.saveTitle': '保存到密码库',

  // 表单字段
  'form.title': '名称',
  'form.titlePlaceholder': '例如：工作邮箱',
  'form.titleRequired': '请输入名称',
  'form.username': '登录账号',
  'form.url': '网站或应用地址',
  'form.category': '分类',
  'form.tags': '标签',
  'form.tagsPlaceholder': '输入后回车添加',
  'form.notes': '备注',
  'form.favorite': '收藏',

  // 密码库
  'vault.title': '密码库',
  'vault.description': '记录、搜索和编辑本地账户资料；密码内容不参与搜索。',
  'vault.hintShort': '密码不参与搜索',
  'vault.lock': '锁定密码库',
  'vault.unlockRequired': '需要解锁密码库',
  'vault.lockedHint': '密码库已锁定。解锁后才能查看、搜索、复制或保存记录。',
  'vault.createHint': '还没有密码库。设置主密码后即可保存记录；生成与复制不需要密码库。',
  'vault.newItem': '新增记录',
  'vault.searchPlaceholder': '搜索名称、账号、网站或标签',
  'vault.empty': '暂无记录',
  'vault.saved': '记录已保存',
  'vault.deleted': '记录已删除',
  'vault.usernameCopied': '账号已复制',
  'vault.passwordCopied': '密码已复制，稍后将自动清理剪贴板',
  'vault.passwordRequired': '请输入密码',
  'vault.columnTitle': '名称',
  'vault.columnUsername': '登录账号',
  'vault.columnCategoryTags': '分类 / 标签',
  'vault.columnUpdatedAt': '修改时间',
  'vault.columnActions': '操作',
  'vault.actionView': '查看',
  'vault.actionCopyUsername': '复制账号',
  'vault.actionCopyPassword': '复制密码',
  'vault.actionEdit': '编辑',
  'vault.actionDelete': '删除',
  'vault.deleteConfirmTitle': '删除这条记录？',
  'vault.deleteConfirmDescription': '已有加密备份中的记录不会被同步删除。',
  'vault.detailTitle': '记录详情',
  'vault.editorEdit': '编辑记录',
  'vault.editorCreate': '新增记录',
  'vault.labelUsername': '登录账号',
  'vault.labelPassword': '密码',
  'vault.labelUrl': '地址',
  'vault.labelCategory': '分类',
  'vault.labelTags': '标签',
  'vault.labelNotes': '备注',
  'vault.timestamps': '创建：{created}    修改：{updated}',

  // 重复录入提醒
  'vault.duplicate.title': '发现可能重复的记录',
  'vault.duplicate.body': '密码库中已有 {count} 条相似记录，仍要保存吗？',
  'vault.duplicate.keep': '仍然保存',
  'vault.duplicate.back': '返回修改',
  'vault.duplicate.reason.same-url-and-username': '网址与账号相同',
  'vault.duplicate.reason.same-url': '网址相同',
  'vault.duplicate.reason.same-title-and-username': '名称与账号相同',
  'vault.duplicate.reason.same-title': '名称相同',

  // 设置
  'settings.title': '设置',
  'settings.description': '锁定策略、剪贴板清理、主密码与加密备份。',
  'settings.lockedNotice':
    '自动锁定、剪贴板、主密码与备份需要先解锁密码库；主题与语言可随时修改。',
  'settings.general': '常规',
  'settings.autoLock': '自动锁定（无操作后）',
  'settings.minutes': '{value} 分钟',
  'settings.clipboard': '复制后清理剪贴板',
  'settings.seconds': '{value} 秒',
  'settings.theme': '主题',
  'settings.accent': '强调色',
  'settings.layout': '界面布局',
  'settings.positionTop': '上方',
  'settings.positionLeft': '左侧',
  'settings.positionRight': '右侧',
  'settings.themeLight': '浅色',
  'settings.themeDark': '深色',
  'settings.themeAuto': '跟随系统',
  'settings.language': '语言',
  'settings.languageZhCN': '简体中文',
  'settings.languageEn': 'English',
  'settings.saved': '设置已保存',
  'settings.changeMaster': '修改主密码',
  'settings.changeMasterHelp':
    '修改后需要重新派生密钥；旧备份不会被改写，仍需旧主密码解锁。',
  'settings.currentMaster': '当前主密码',
  'settings.currentMasterRequired': '请输入当前主密码',
  'settings.newMaster': '新主密码',
  'settings.newMasterRequired': '请输入新主密码',
  'settings.confirmMaster': '确认新主密码',
  'settings.confirmMasterRequired': '请再次输入新主密码',
  'settings.newMasterMismatch': '两次输入的新主密码不一致',
  'settings.changeMasterSubmit': '修改主密码',
  'settings.changed': '主密码已修改，旧备份仍需使用旧主密码解锁',
  'settings.backup': '加密备份与恢复',
  'settings.backupHelp':
    '备份完整密文与加密参数，不提供默认明文导出。恢复采用“替换当前库”，替换前会自动保留当前库的加密副本。',
  'settings.export': '导出加密备份',
  'settings.exported': '加密备份已导出',
  'settings.restorePasswordPlaceholder': '输入备份文件的主密码',
  'settings.restorePasswordRequired': '请输入备份的主密码',
  'settings.restore': '选择备份并恢复',
  'settings.restoreHelp':
    '恢复前会验证主密码与文件完整性；密码错误、文件损坏或版本不兼容时不会覆盖当前数据。',
  'settings.restoreConfirmTitle': '确认用备份覆盖当前密码库？',
  'settings.restoreConfirmBody':
    '恢复会整库替换：当前库中不在备份里的记录将不再出现在列表中。替换前会自动保留一份加密副本，但仍建议先导出当前库备份。',
  'settings.restoreConfirmOk': '覆盖并恢复',
  'settings.restoreDone': '恢复完成',
  'settings.restoreDoneSimple': '密码库已从备份恢复。',
  'settings.restoreDoneWithBackup': '当前密码库已替换，替换前的加密备份保存在：{path}',
  'settings.lockNow': '立即锁定',
  'settings.defaults': '默认设置：自动锁定 {minutes} 分钟，剪贴板 {seconds} 秒后清理',

  // 密码强度
  'strength.0': '很弱',
  'strength.1': '弱',
  'strength.2': '一般',
  'strength.3': '强',
  'strength.4': '很强',
  'strength.entropy': '估算熵值 {bits} bit',
  'strength.suggestion.empty': '请输入密码',
  'strength.suggestion.too-short': '建议至少 12 个字符',
  'strength.suggestion.mix-character-classes': '建议混合大小写、数字和符号',
  'strength.suggestion.avoid-repeats': '避免大量重复字符',

  // 生成器提示
  'warning.short-length': '长度较短，建议 12 位以上',
  'warning.low-entropy': '字符空间有限，不建议用于高价值账户',
  'warning.letters-only': '仅使用字母时更容易被猜解',

  // 强调色名称
  'accent.indigo': '靛蓝',
  'accent.blue': '蓝色',
  'accent.emerald': '翡翠绿',
  'accent.violet': '紫罗兰',
  'accent.amber': '琥珀',
  'accent.rose': '玫瑰',

  // 表单校验
  'validation.masterTooShort': '主密码至少需要 {min} 个字符',

  // 错误码
  'error.INVALID_INPUT': '输入内容不符合要求',
  'error.VAULT_NOT_FOUND': '未找到密码库文件',
  'error.VAULT_ALREADY_EXISTS': '密码库已存在',
  'error.VAULT_LOCKED': '密码库已锁定，请先解锁',
  'error.VAULT_ALREADY_UNLOCKED': '密码库已处于解锁状态',
  'error.INVALID_MASTER_PASSWORD': '主密码错误，或密码库文件已损坏',
  'error.WEAK_MASTER_PASSWORD': '主密码不满足长度要求',
  'error.CORRUPTED_VAULT': '密码库文件结构或密文完整性异常',
  'error.UNSUPPORTED_FORMAT': '文件版本不受支持',
  'error.VAULT_BUSY': '密码库正被另一个进程使用',
  'error.ITEM_NOT_FOUND': '未找到该记录',
  'error.BACKUP_FAILED': '备份失败',
  'error.RESTORE_FAILED': '恢复失败',
  'error.CRYPTO_FAILURE': '加密操作失败',
  'error.STORAGE_FAILURE': '写入磁盘失败，原文件未被修改',
  'error.INTERNAL_ERROR': '发生未知错误',
  'error.UNKNOWN': '操作失败，请重试',

  // 顶层错误边界
  'error.boundaryTitle': '界面出现了异常',
  'error.boundaryHelp':
    '可以重新加载界面继续使用；若反复出现，请复制下方详情并反馈。密码库文件本身不受影响。',
  'error.boundaryReload': '重新加载',
  'error.boundaryRetry': '尝试恢复',
  'error.retry': '重试',

  // 无副作用/可恢复的界面提示
  'vault.undo': '撤销',
  'vault.undoDone': '记录已恢复',
  'vault.favorite': '收藏',
  'vault.allCategories': '全部分类',
  'vault.autoLockIn': '{minutes} 分钟后自动锁定',
  'vault.autoLockHint': '没有任何操作时，密码库会自动锁定',

  // 编辑未保存时关闭
  'editor.discardTitle': '放弃未保存的修改？',
  'editor.discardBody': '关闭后本次填写的内容会丢失，已保存的记录不受影响。',
  'editor.discardOk': '放弃修改',
  'editor.discardKeep': '继续编辑',

  // 创建密码库前的确认
  'setup.confirmTitle': '确认创建密码库？',
  'setup.confirmBody':
    '主密码用于派生加密密钥，无法找回也无法重置。请确认已经把它记录在安全的地方。',
  'setup.confirmOk': '我已记住主密码，创建',

  // 设置页
  'settings.lockedValue': '解锁后可查看',
  'settings.about': '关于',
  'settings.version': '版本',
  'settings.runtime': '运行环境',
  'settings.dataDir': '数据目录',
  'settings.openDataDir': '打开目录',
  'settings.aboutHelp':
    '所有记录都保存在上面的目录里（密文文件）。反馈问题时请附上版本号与运行环境。',

  'strength.label': '密码强度',
} as const;

const en: Record<keyof typeof zhCN, string> = {
  'common.lock': 'Lock',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.copy': 'Copy',

  'nav.workbench': 'Workbench',
  'nav.settings': 'Settings',
  'nav.backToWorkbench': 'Back to workbench',
  'nav.back': 'Back',

  'setup.title': 'Create your {app} vault',
  'setup.master': 'Master password',
  'setup.masterRequired': 'Please enter your master password',
  'setup.confirm': 'Confirm master password',
  'setup.confirmRequired': 'Please enter the master password again',
  'setup.mismatch': 'The two master passwords do not match',
  'setup.submit': 'Create vault',
  'setup.help':
    'Use at least {min} characters; spaces and long passphrases are allowed. There is no password recovery: without the master password, encrypted backups cannot be decrypted either.',

  'unlock.title': 'Unlock {app}',
  'unlock.master': 'Master password',
  'unlock.masterRequired': 'Please enter your master password',
  'unlock.submit': 'Unlock',

  'generator.title': 'Password generator',
  'generator.hintShort': '8–20 chars · configurable classes',
  'generator.description':
    'Generates {min}-{max} character passwords with the system CSPRNG. Unsaved results are never written to disk.',
  'generator.rulesCard': 'Rules',
  'generator.resultCard': 'Result',
  'generator.length': 'Length: {length}',
  'generator.lengthShort': 'Length',
  'generator.lengthInput': 'Type the length',
  'generator.classes': 'Character classes',
  'generator.uppercase': 'Uppercase',
  'generator.lowercase': 'Lowercase',
  'generator.numbers': 'Digits',
  'generator.symbols': 'Symbols',
  'generator.excludeAmbiguous': 'Exclude ambiguous characters (0/O, 1/l/I)',
  'generator.excludeAmbiguousShort': 'Exclude ambiguous',
  'generator.placeholder': 'Click generate to create a password',
  'generator.copy': 'Copy',
  'generator.regenerate': 'Regenerate',
  'generator.save': 'Save',
  'generator.copied': 'Copied. The clipboard will be cleared automatically.',
  'generator.saved': 'Saved to the vault',
  'generator.saveTitle': 'Save to vault',

  'form.title': 'Name',
  'form.titlePlaceholder': 'e.g. Work email',
  'form.titleRequired': 'Please enter a name',
  'form.username': 'Username',
  'form.url': 'Website or app URL',
  'form.category': 'Category',
  'form.tags': 'Tags',
  'form.tagsPlaceholder': 'Press Enter to add',
  'form.notes': 'Notes',
  'form.favorite': 'Favorite',

  'vault.title': 'Vault',
  'vault.description':
    'Store, search and edit local accounts. Passwords are never searched.',
  'vault.hintShort': 'Passwords are not searched',
  'vault.lock': 'Lock vault',
  'vault.unlockRequired': 'Unlock required',
  'vault.lockedHint':
    'The vault is locked. Unlock to view, search, copy or save records.',
  'vault.createHint':
    'No vault yet. Set a master password to start saving records; generating and copying work without a vault.',
  'vault.newItem': 'New record',
  'vault.searchPlaceholder': 'Search name, username, website or tag',
  'vault.empty': 'No records yet',
  'vault.saved': 'Record saved',
  'vault.deleted': 'Record deleted',
  'vault.usernameCopied': 'Username copied',
  'vault.passwordCopied': 'Password copied. The clipboard will be cleared automatically.',
  'vault.passwordRequired': 'Please enter a password',
  'vault.columnTitle': 'Name',
  'vault.columnUsername': 'Username',
  'vault.columnCategoryTags': 'Category / Tags',
  'vault.columnUpdatedAt': 'Updated',
  'vault.columnActions': 'Actions',
  'vault.actionView': 'View',
  'vault.actionCopyUsername': 'Copy username',
  'vault.actionCopyPassword': 'Copy password',
  'vault.actionEdit': 'Edit',
  'vault.actionDelete': 'Delete',
  'vault.deleteConfirmTitle': 'Delete this record?',
  'vault.deleteConfirmDescription':
    'Records inside existing encrypted backups are not affected.',
  'vault.detailTitle': 'Record details',
  'vault.editorEdit': 'Edit record',
  'vault.editorCreate': 'New record',
  'vault.labelUsername': 'Username',
  'vault.labelPassword': 'Password',
  'vault.labelUrl': 'URL',
  'vault.labelCategory': 'Category',
  'vault.labelTags': 'Tags',
  'vault.labelNotes': 'Notes',
  'vault.timestamps': 'Created: {created}    Updated: {updated}',

  'vault.duplicate.title': 'Possible duplicate found',
  'vault.duplicate.body':
    'The vault already contains {count} similar record(s). Save anyway?',
  'vault.duplicate.keep': 'Save anyway',
  'vault.duplicate.back': 'Back to editing',
  'vault.duplicate.reason.same-url-and-username': 'same URL and username',
  'vault.duplicate.reason.same-url': 'same URL',
  'vault.duplicate.reason.same-title-and-username': 'same name and username',
  'vault.duplicate.reason.same-title': 'same name',

  'settings.title': 'Settings',
  'settings.description':
    'Locking policy, clipboard clearing, master password and encrypted backups.',
  'settings.lockedNotice':
    'Auto-lock, clipboard, master password and backups require an unlocked vault; theme and language can be changed anytime.',
  'settings.general': 'General',
  'settings.autoLock': 'Auto-lock after inactivity',
  'settings.minutes': '{value} min',
  'settings.clipboard': 'Clear clipboard after copying',
  'settings.seconds': '{value} s',
  'settings.theme': 'Theme',
  'settings.accent': 'Accent color',
  'settings.layout': 'Layout',
  'settings.positionTop': 'Top',
  'settings.positionLeft': 'Left',
  'settings.positionRight': 'Right',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.themeAuto': 'Follow system',
  'settings.language': 'Language',
  'settings.languageZhCN': '简体中文',
  'settings.languageEn': 'English',
  'settings.saved': 'Settings saved',
  'settings.changeMaster': 'Change master password',
  'settings.changeMasterHelp':
    'A new key is derived after the change. Existing backups keep the old master password.',
  'settings.currentMaster': 'Current master password',
  'settings.currentMasterRequired': 'Please enter the current master password',
  'settings.newMaster': 'New master password',
  'settings.newMasterRequired': 'Please enter the new master password',
  'settings.confirmMaster': 'Confirm new master password',
  'settings.confirmMasterRequired': 'Please enter the new master password again',
  'settings.newMasterMismatch': 'The two new master passwords do not match',
  'settings.changeMasterSubmit': 'Change master password',
  'settings.changed': 'Master password changed. Old backups still need the old password.',
  'settings.backup': 'Encrypted backup and restore',
  'settings.backupHelp':
    'Backups contain the full ciphertext and KDF parameters; there is no plaintext export. Restore replaces the current vault and keeps an encrypted copy of it beforehand.',
  'settings.export': 'Export encrypted backup',
  'settings.exported': 'Encrypted backup exported',
  'settings.restorePasswordPlaceholder': 'Master password of the backup file',
  'settings.restorePasswordRequired': 'Please enter the backup master password',
  'settings.restore': 'Choose a backup and restore',
  'settings.restoreHelp':
    'The master password and file integrity are verified first. A wrong password, a corrupted file or an unsupported version will never overwrite your current data.',
  'settings.restoreConfirmTitle': 'Overwrite the current vault with this backup?',
  'settings.restoreConfirmBody':
    'Restoring replaces the whole vault: records that are not in the backup will disappear from the list. An encrypted copy of the current vault is kept, but exporting the current vault first is still recommended.',
  'settings.restoreConfirmOk': 'Overwrite and restore',
  'settings.restoreDone': 'Restore complete',
  'settings.restoreDoneSimple': 'The vault was restored from the backup.',
  'settings.restoreDoneWithBackup':
    'The vault has been replaced. The previous vault was kept at: {path}',
  'settings.lockNow': 'Lock now',
  'settings.defaults':
    'Defaults: auto-lock {minutes} min, clipboard cleared after {seconds} s',

  'strength.0': 'Very weak',
  'strength.1': 'Weak',
  'strength.2': 'Fair',
  'strength.3': 'Strong',
  'strength.4': 'Very strong',
  'strength.entropy': 'Estimated entropy {bits} bit',
  'strength.suggestion.empty': 'Please enter a password',
  'strength.suggestion.too-short': 'Use at least 12 characters',
  'strength.suggestion.mix-character-classes':
    'Mix uppercase, lowercase, digits and symbols',
  'strength.suggestion.avoid-repeats': 'Avoid repeating the same characters',

  'warning.short-length': 'Quite short — 12 characters or more is recommended',
  'warning.low-entropy': 'Limited character space, not ideal for high-value accounts',
  'warning.letters-only': 'Letters only are easier to guess',

  'accent.indigo': 'Indigo',
  'accent.blue': 'Blue',
  'accent.emerald': 'Emerald',
  'accent.violet': 'Violet',
  'accent.amber': 'Amber',
  'accent.rose': 'Rose',

  'validation.masterTooShort': 'The master password needs at least {min} characters',

  'error.INVALID_INPUT': 'The input is not valid',
  'error.VAULT_NOT_FOUND': 'Vault file not found',
  'error.VAULT_ALREADY_EXISTS': 'A vault already exists',
  'error.VAULT_LOCKED': 'The vault is locked. Unlock it first.',
  'error.VAULT_ALREADY_UNLOCKED': 'The vault is already unlocked',
  'error.INVALID_MASTER_PASSWORD':
    'Wrong master password, or the vault file is corrupted',
  'error.WEAK_MASTER_PASSWORD': 'The master password is shorter than required',
  'error.CORRUPTED_VAULT': 'The vault file structure or ciphertext is invalid',
  'error.UNSUPPORTED_FORMAT': 'Unsupported file version',
  'error.VAULT_BUSY': 'The vault is in use by another process',
  'error.ITEM_NOT_FOUND': 'Record not found',
  'error.BACKUP_FAILED': 'Backup failed',
  'error.RESTORE_FAILED': 'Restore failed',
  'error.CRYPTO_FAILURE': 'Cryptographic operation failed',
  'error.STORAGE_FAILURE': 'Writing to disk failed; the original file was not modified',
  'error.INTERNAL_ERROR': 'An unknown error occurred',
  'error.UNKNOWN': 'Operation failed, please try again',

  'error.boundaryTitle': 'The interface hit an unexpected error',
  'error.boundaryHelp':
    'Reload the interface to continue. If it keeps happening, copy the details below and report it. The vault file itself is not affected.',
  'error.boundaryReload': 'Reload',
  'error.boundaryRetry': 'Try to recover',
  'error.retry': 'Retry',

  'vault.undo': 'Undo',
  'vault.undoDone': 'Record restored',
  'vault.favorite': 'Favorite',
  'vault.allCategories': 'All categories',
  'vault.autoLockIn': 'Auto-lock in {minutes} min',
  'vault.autoLockHint': 'The vault locks itself when there is no activity',

  'editor.discardTitle': 'Discard unsaved changes?',
  'editor.discardBody':
    'What you typed will be lost when the editor closes. Saved records are not affected.',
  'editor.discardOk': 'Discard',
  'editor.discardKeep': 'Keep editing',

  'setup.confirmTitle': 'Create the vault?',
  'setup.confirmBody':
    'The master password derives the encryption key and cannot be recovered or reset. Make sure it is stored somewhere safe.',
  'setup.confirmOk': 'I have saved it, create',

  'settings.lockedValue': 'Unlock to view',
  'settings.about': 'About',
  'settings.version': 'Version',
  'settings.runtime': 'Runtime',
  'settings.dataDir': 'Data directory',
  'settings.openDataDir': 'Open folder',
  'settings.aboutHelp':
    'All records live in the folder above as an encrypted file. Include the version and runtime when reporting a problem.',

  'strength.label': 'Password strength',
};

export type MessageKey = keyof typeof zhCN;

export const MESSAGES: Record<AppLanguage, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
  en,
};
