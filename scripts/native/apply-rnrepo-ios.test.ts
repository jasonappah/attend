import { describe, expect, test } from 'bun:test'
import { applyRnrepoToPodfile, POST_INSTALL_MARKER, REQUIRE_MARKER } from './apply-rnrepo-ios'

const SAMPLE = `platform :ios, '17.0'
target 'attend' do
  config = use_native_modules!
  post_install do |installer|
    react_native_post_install(installer)
  end
end
`

describe('applyRnrepoToPodfile', () => {
  test('injects require and post_install hook', () => {
    const { podfile, changed } = applyRnrepoToPodfile(SAMPLE)
    expect(changed).toBe(true)
    expect(podfile).toContain(REQUIRE_MARKER)
    expect(podfile).toContain('@rnrepo/build-tools/cocoapods-plugin/lib/plugin.rb')
    expect(podfile).toContain(POST_INSTALL_MARKER)
    expect(podfile).toContain('rnrepo_post_install(installer)')
    expect(podfile.indexOf('rnrepo_post_install')).toBeGreaterThan(
      podfile.indexOf('post_install do')
    )
  })

  test('is idempotent', () => {
    const once = applyRnrepoToPodfile(SAMPLE)
    const twice = applyRnrepoToPodfile(once.podfile)
    expect(twice.changed).toBe(false)
    expect(twice.podfile).toBe(once.podfile)
  })

  test('throws when post_install is missing', () => {
    expect(() => applyRnrepoToPodfile("target 'attend' do\nend\n")).toThrow(/post_install/)
  })
})
