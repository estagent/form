import {error as loaderError} from '@revgaming/errors'
import status from '@revgaming/status'
import cloneDeep from 'lodash.clonedeep'
import {reactive} from 'vue'

export default function(instance, ...args) {
  const data = (typeof args[0] === 'string' ? args[1] : args[0]) || {}
  let defaults = cloneDeep(data)
  let recentlySuccessfulTimeoutId = null
  let transform = data => data
  let form = reactive({
    // return {
    isDirty: false,
    hasErrors: false,
    hasMessages: false,
    processing: false,
    progress: null,
    wasSuccessful: false,
    recentlySuccessful: false,
    data() {
      return Object.keys(data).reduce((carry, key) => {
        carry[key] = this[key]
        return carry
      }, {})
    },
    errors: {},
    messages: {},
    transform(callback) {
      transform = callback
      return this
    },
    reset(...fields) {
      let clonedDefaults = cloneDeep(defaults)
      if (fields.length === 0) {
        Object.assign(this, clonedDefaults)
      } else {
        Object.assign(
          this,
          Object.keys(clonedDefaults)
            .filter(key => fields.includes(key))
            .reduce((carry, key) => {
              carry[key] = clonedDefaults[key]
              return carry
            }, {}),
        )
      }

      return this
    },
    clearErrors(...fields) {
      this.errors = Object.keys(this.errors).reduce(
        (carry, field) => ({
          ...carry,
          ...(fields.length > 0 && !fields.includes(field)
            ? {[field]: this.errors[field]}
            : {}),
        }),
        {},
      )

      this.hasErrors = Object.keys(this.errors).length > 0

      return this
    },
    clearMessages() {
      this.messages = Object.keys(this.messages).reduce(
        (carry, field) => ({
          ...carry,
          ...{},
        }),
        {},
      )
      this.hasMessages = false
      return this
    },
    get(url, options) {
      return this.submit('get', url, options)
    },
    post(url, options) {
      return this.submit('post', url, options)
    },
    put(url, options) {
      return this.submit('put', url, options)
    },
    patch(url, options) {
      return this.submit('patch', url, options)
    },
    delete(url, options) {
      return this.submit('delete', url, options)
    },
    submit(method, url, options = {}) {
      const data = transform(this.data())
      const _options = {
        ...options,
      }

      this.wasSuccessful = false
      this.recentlySuccessful = false
      clearTimeout(recentlySuccessfulTimeoutId)

      this.processing = true
      this.clearErrors()
      this.clearMessages()

      return instance[method](url, data, _options)
        .then(response => {

          const data = response.data

          this.processing = false
          this.progress = null
          this.wasSuccessful = true
          this.recentlySuccessful = true
          recentlySuccessfulTimeoutId = setTimeout(
            () => (this.recentlySuccessful = false),
            2000,
          )

          if (data.success) this.messages.success = data.success
          if (data.warning) this.messages.warning = data.warning
          if (data.info) this.messages.info = data.info

          this.hasMessages = Object.keys(this.messages).length > 0

          const onSuccess = options.onSuccess
            ? options.onSuccess(data)
            : null

          defaults = cloneDeep(this.data())
          this.isDirty = false
          return options.onSuccess ? onSuccess : data
        })
        .catch(err => {

          this.processing = false
          this.progress = null
          this.hasErrors = true

          if (err.response && err.response.data) {
            const data = err.response.data
            if (err.response.status === status.UNPROCESSABLE_ENTITY) {
              if (data.errors) {
                for (const key in data.errors) {
                  this.errors[key] = data.errors[key][0]
                }
              } else {
                for (const key in data) {
                  this.errors[key] = data[key][0]
                }
              }
            } else {
              this.messages.error = loaderError(err)
            }
          } else {
            this.messages.error = loaderError(err)
          }
          this.hasMessages = Object.keys(this.messages).length > 0
          if (options.onError) {
            return options.onError(err)
          } else throw err
        })
    },
  })
  return form.reset()
}
