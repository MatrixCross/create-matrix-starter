#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import minimist from 'minimist'
import prompts from 'prompts'
import dayjs from 'dayjs'
import {
  reset,
  blue,
  cyan,
  lightBlue,
  lightCyan,
  lightYellow,
  lightGreen,
  lightRed,
  yellow,
  red,
  green,
} from 'kolorist'

// Avoids autoconversion to number of the project name by defining that the args
// non associated with an option ( _ ) needs to be parsed as a string.
const argv = minimist(process.argv.slice(2), { string: ['_'] })
const cwd = process.cwd()

const FRAMEWORKS = [
  {
    name: 'lib',
    color: red,
    variants: [
      {
        name: 'unbuild(推荐)',
        color: lightBlue,
        dir: 'lib-unbuild-starter',
      },
      {
        name: 'rollup',
        color: lightRed,
        dir: 'lib-rollup-starter',
      },
    ],
  },
  {
    name: 'vue3',
    color: green,
    variants: [
      {
        name: 'PCWeb-Soybean-Admin(推荐)',
        color: lightBlue,
        dir: 'vue3-pcweb-soybean-admin',
      },
      {
        name: 'PCWeb-TDesign(推荐)',
        color: lightBlue,
        dir: 'vue3-pcweb-tdesign-starter',
      },
      {
        name: 'PCWeb-NaiveUI',
        color: lightBlue,
        dir: 'vue3-pcweb-naiveui-starter',
      },
      {
        name: 'H5Web-Vant',
        color: lightBlue,
        dir: 'vue3-h5web-vant-starter',
      },
      {
        name: 'H5Web-VarletUI',
        color: lightBlue,
        dir: 'vue3-h5web-varlet-starter',
      },
      {
        name: 'crx-NaiveUI',
        color: blue,
        dir: 'vue3-crx-starter',
      },
      {
        name: 'Uniapp-uview-plus',
        color: yellow,
        dir: 'vue3-uniapp-starter',
      },
      {
        name: 'Taro-NutUI',
        color: yellow,
        dir: 'vue3-taro-starter',
      },
    ],
  },
  {
    name: 'vue2',
    color: lightRed,
    variants: [
      {
        name: 'Vue2.7-PCWeb-Elementui',
        color: lightBlue,
        dir: 'vue2.7-pcweb-element-starter',
      },
      {
        name: 'Vue2.7-PCWeb-TDesign',
        color: lightBlue,
        dir: 'vue2.7-pcweb-tdesign-starter',
      },
      {
        name: 'Vue2-Uniapp-Uview',
        color: green,
        dir: 'vue2-uniapp-starter',
      },
    ],
  },
  {
    name: 'react',
    color: lightCyan,
    variants: [
      {
        name: 'React-Soybean-Admin',
        color: lightYellow,
        dir: 'react-soybean-admin',
      },
      {
        name: 'React-Crx-Starter',
        color: lightGreen,
        dir: 'react-crx-starter',
      },
    ],
  },
  {
    name: 'weapp',
    color: cyan,
    dir: 'weapp-starter',
  },
]

const TEMPLATES = FRAMEWORKS.map(
  (f) => (f.variants && f.variants.map((v) => v.name)) || [f.dir]
).reduce((a, b) => a.concat(b), [])

const renameFiles = {
  // _gitignore: '.gitignore',
}

async function init() {
  let targetDir = formatTargetDir(argv._[0])
  let template = argv.template || argv.t
  let defaultVersion = argv.version || dayjs().format('YYYY.MMDD.HHmm')

  const defaultTargetDir = 'my-project'
  const getProjectName = () =>
    targetDir === '.' ? path.basename(path.resolve()) : targetDir

  let result = {}

  try {
    result = await prompts(
      [
        {
          type: targetDir ? null : 'text',
          name: 'projectName',
          message: reset('项目名称:'),
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir
          },
        },
        {
          type: () =>
            !fs.existsSync(targetDir) || isEmpty(targetDir) ? null : 'confirm',
          name: 'overwrite',
          message: () =>
            (targetDir === '.' ? '当前目录' : `目标目录 "${targetDir}"`) +
            ` 不为空. 是否清空后继续?`,
        },
        {
          type: (_, { overwrite } = {}) => {
            if (overwrite === false) {
              throw new Error(red('✖') + ' 取消创建')
            }
            return null
          },
          name: 'overwriteChecker',
        },
        {
          type: () => (isValidPackageName(getProjectName()) ? null : 'text'),
          name: 'packageName',
          message: reset('项目名称:'),
          initial: () => toValidPackageName(getProjectName()),
          validate: (dir) =>
            isValidPackageName(dir) || '非法的 package.json name',
        },
        {
          type: 'text',
          name: 'version',
          message: reset('版本号:'),
          initial: defaultVersion,
          validate: (version) =>
            isValidPackageVersion(version) || '非法的 package.json 版本号',
        },
        {
          type: template && TEMPLATES.includes(template) ? null : 'select',
          name: 'framework',
          message:
            typeof template === 'string' && !TEMPLATES.includes(template)
              ? reset(`"${template}" 不是一个有效的模板. 请从下方选择: `)
              : reset('选择一个模板:'),
          initial: 0,
          choices: FRAMEWORKS.map((framework) => {
            const frameworkColor = framework.color
            return {
              title: frameworkColor(framework.name),
              value: framework,
            }
          }),
        },
        {
          type: (framework) =>
            framework && framework.variants ? 'select' : null,
          name: 'variant',
          message: reset('选择一个变体:'),
          // @ts-ignore
          choices: (framework) =>
            framework.variants.map((variant) => {
              const variantColor = variant.color
              return {
                title: variantColor(variant.name),
                value: variant,
              }
            }),
        },
      ],
      {
        onCancel: () => {
          throw new Error(red('✖') + ' 取消创建')
        },
      }
    )
  } catch (cancelled) {
    console.log(cancelled.message)
    return
  }

  // user choice associated with prompts
  const { framework, overwrite, packageName, variant, version } = result

  const root = path.join(cwd, targetDir)

  if (overwrite) {
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
  }

  // determine template
  template = variant || framework || template

  console.log(`\n在 ${root} 搭建脚手架中...`)

  const templateDir = path.resolve(
    fileURLToPath(import.meta.url),
    '..',
    `template-${template.dir}`
  )

  const write = (file, content) => {
    const targetPath = renameFiles[file]
      ? path.join(root, renameFiles[file])
      : path.join(root, file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      copy(path.join(templateDir, file), targetPath)
    }
  }

  const files = fs.readdirSync(templateDir)
  for (const file of files.filter((f) => f !== 'package.json')) {
    write(file)
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8')
  )

  pkg.name = packageName || getProjectName()
  pkg.version = version

  write('package.json', JSON.stringify(pkg, null, 2) + '\n')

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  console.log(`\搭建完成，请执行下面指令:\n`)
  if (root !== cwd) {
    console.log(`  cd ${path.relative(cwd, root)}`)
  }
  console.log('  git init')
  switch (pkgManager) {
    case 'yarn':
      console.log('  yarn')
      console.log('  yarn dev')
      break
    case 'pnpm':
      console.log('  pnpm i')
      console.log('  pnpm dev')
      break
    default:
      console.log(`  ${pkgManager} i`)
      console.log(`  ${pkgManager} run dev`)
      break
  }
  console.log()
}

/**
 * 替换反斜杠 / 为空字符串。
 * @param {string | undefined} targetDir
 */
function formatTargetDir(targetDir) {
  return targetDir?.trim().replace(/\/+$/g, '')
}

function copy(src, dest) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}

/**
 * @param {string} projectName
 */
function isValidPackageName(projectName) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
    projectName
  )
}

/**
 * @param {string} vision
 */
function isValidPackageVersion(vision) {
  return /^\d+\.\d+\.\d+(\-[a-zA-Z0-9]+((\.[a-zA-Z0-9]+)|[a-zA-Z0-9]+)?)?$/.test(
    vision
  )
}

/**
 * @param {string} projectName
 */
function toValidPackageName(projectName) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-')
}

/**
 * @param {string} srcDir
 * @param {string} destDir
 */
function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

/**
 * @param {string} path
 */
function isEmpty(path) {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

/**
 * @param {string} dir
 */
function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const file of fs.readdirSync(dir)) {
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
  }
}

/**
 * @param {string | undefined} userAgent process.env.npm_config_user_agent
 * @returns object | undefined
 */
function pkgFromUserAgent(userAgent) {
  if (!userAgent) return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  }
}

init().catch((e) => {
  console.error(e)
})
