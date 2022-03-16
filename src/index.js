import form from './form'

export default function(request) {
  return {
    form: (...args) => form(request, ...args),
  }
}