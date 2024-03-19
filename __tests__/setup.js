process.on('unhandledRejection', reason => {
  console.error(reason)
  throw reason
})
