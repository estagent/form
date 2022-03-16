import form from './form'
import {setRequest} from './request'

export default function(request) {
  setRequest(request)
  return {
    form: form,
  }
}