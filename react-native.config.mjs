const packagesWithOwnLinking = [
  `react-native-screens`,
  `react-native-safe-area-context`,
  `react-native-reanimated`,
  `react-native-gesture-handler`,
]

const thing = {
  platforms: {
    android: {
      libraryName: null,
      componentDescriptors: null,
      cmakeListsPath: null,
      cxxModuleCMakeListsModuleName: null,
      cxxModuleCMakeListsPath: null,
      cxxModuleHeaderName: null,
    },
  },
}

module.exports = {
  dependencies: {
    ...packagesWithOwnLinking.reduce((acc, curr) => {
      acc[curr] = thing
      return acc
    }, {}),
  },
}
