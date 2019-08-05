// 引入样式文件
require('./index.scss')

import template from './template'
import { hsv2hsl, parseColor, hsv2rgb } from './color'
import Draggable, { Coordinate } from './draggable'
import { $, PlainObject, isFunction } from './utils'

const UI_NAME = 'mo-color-picker'

type ColorFormat = 'hsl' | 'hsv' | 'hex' | 'rgb'

interface Colors {
  h: number
  s: number
  v: number
  a: number
}

interface Props {
  value?: string
  format?: ColorFormat
  alpha?: boolean
  change?: Function
}

const defaults: Props = {
  value: null,
  format: 'rgb',
  alpha: false,
  change: (color: string, colors?: Colors) => { }
}

const Selectors = {
  sat: '.mo-color-sat-val',
  hue: '.mo-color-hue',
  alp: '.mo-color-alpha',
  rail: '.mo-color-rail',
  thumb: '.mo-color-thumb'
}


function render(this: ColorPicker) {
  const { _props: props, _states: states } = this
  const $el = document.createElement('div')
  $el.className = UI_NAME
  $el.innerHTML = template

  // 缓存DOM
  states.$el = $el
  states.$sat = $(Selectors.sat, $el)
  states.$hue = $(Selectors.hue, $el)
  states.$alp = $(Selectors.alp, $el)
  states.$satThumb = $(Selectors.thumb, states.$sat)
  states.$hueThumb = $(Selectors.thumb, states.$hue)
  states.$alpThumb = $(Selectors.thumb, states.$alp)
  states.$alpRail = $(Selectors.rail, states.$alp)
  states.$wrap.appendChild($el)

  bindEvents.call(this)
}


/**
 * 绑定事件
 * @private
 * @param {ColorPicker} this
 */
function bindEvents(this: ColorPicker) {
  const { _states: states } = this
  const _ = this

  // 饱和度/明度层拖拽回调
  function satDrag(coordinate: Coordinate) {
    const { top, left } = coordinate
    const { satWidth, satHeight } = states
    const saturation = left / satWidth
    const value = 1 - top / satHeight
    states.s = saturation
    states.v = value
    afterSatChange.call(_)
    updateColor.call(_)
  }

  // 色相面板拖拽回调
  function hueDrag(coordinate: Coordinate) {
    const { left } = coordinate
    const { hueWidth } = states
    states.h = (left / hueWidth) * 360
    afterHueChange.call(_)
    updateColor.call(_)
  }

  // 透明度面板拖拽回调
  function alpDrag(coordinate: Coordinate) {
    const { left } = coordinate
    const { alpWidth } = states
    states.a = left / alpWidth
    afterAlpChange.call(_, true, false)
    updateColor.call(_)
  }

  // 分别初始化Draggable
  states.satDragIns = new Draggable(states.$sat, {
    drag: satDrag,
    end: satDrag
  })
  states.hueDragIns = new Draggable(states.$hue, {
    drag: hueDrag,
    end: hueDrag
  })
  states.alpDragIns = new Draggable(states.$alp, {
    drag: alpDrag,
    end: alpDrag
  })
}

/**
 * 解绑事件
 * @private
 * @param {ColorPicker} this
 */
function unbindEvents(this: ColorPicker) {
  const { _states: states } = this
  states.satDragIns && states.satDragIns.destroy()
  states.hueDragIns && states.hueDragIns.destroy()
  states.alpDragIns && states.alpDragIns.destroy()
}


function afterSatChange(this: ColorPicker) {
  const { _states: states } = this
  const { s, v } = states
  states.satWidth = states.satWidth || states.$sat.offsetWidth
  states.satHeight = states.satHeight || states.$sat.offsetHeight
  const top = Math.round((1 - v) * states.satHeight)
  const left = Math.round(s * states.satWidth)
  // 在白色多的地方显示为反色， 优化
  const color = s <= .2 && v >= .8 ? 'rgba(0,0,0,.7)' : 'white'
  states.$satThumb.style.cssText += `top: ${top}px; left: ${left}px; color: ${color};`
  afterAlpChange.call(this, false, true)
}

function afterHueChange(this: ColorPicker) {
  const { _states: states } = this
  const { h } = states
  states.hueWidth = states.hueWidth || states.$hue.offsetWidth
  const left = Math.round(h / 360 * states.hueWidth)
  states.$hueThumb.style.left = left + 'px'
  states.$sat.style.background = `hsl(${h}, 100%, 50%)`
  afterAlpChange.call(this, false, true)
}

function afterAlpChange(this: ColorPicker, updateLeft: boolean = true, updateColor: boolean = true) {
  const { _states: states } = this
  const { h, s, v, a } = states
  if (updateLeft) {
    states.alpWidth = states.alpWidth || states.$alp.offsetWidth
    states.$alpThumb.style.left = a * states.alpWidth + 'px'
  }
  if (updateColor) {
    const hsl = hsv2hsl(h, s, v)
    states.$alpRail.style.background = `linear-gradient(to right, transparent, hsl(${hsl.h}, ${hsl.s * 100}%, ${hsl.l * 100}%))`
  }
}

function afterColorsChange(this: ColorPicker) {
  afterSatChange.call(this)
  afterHueChange.call(this)
  afterAlpChange.call(this, true, true)
}

/**
 * 校验颜色是否合法
 * 思路：给一个DOM元素设置背景色为当前颜色
 * 如果设置成功，则表示合法
 * 如果没有设置上，则表示不合法
 * @param color 
 */
function checkColor(color: string) {
  let $el = document.createElement('div')
  $el.style.backgroundColor = color
  const bgColor = $el.style.backgroundColor
  $el = null
  return !!bgColor
}


function value2Colors(this: ColorPicker, value: string, init?: boolean) {
  // h: 0 - 360
  // s: 0 - 1
  // v: 0 - 1
  const { _props: props, _states: states } = this
  if (value) {
    // 正确时返回颜色值，不正确时返回undefined
    const { h, s, v, a } = parseColor(value)
    // 校验当前颜色是否正确
    if (h === void 0 || !checkColor(`hsv(${h}, ${s * 100}%, ${v * 100}%)`)) {
      // 不做操作
    } else {
      states.h = h
      states.s = s
      states.v = v
      states.a = a
      afterColorsChange.call(this)
      return
    }
  }

  if (init) {
    states.h = 360
    states.s = 1
    states.v = 1
    states.a = 1
    afterColorsChange.call(this)
  }
}


function updateColor(this: ColorPicker) {
  const { _props: props, _states: states } = this
  const {h, s, v, a} = states
  isFunction(props.change) && props.change.call(this, this.getValue(), {
    h, s, v, a
  })
}

export class ColorPicker {
  protected _states: PlainObject
  protected _props: Props
  constructor(wrapper: HTMLElement, options?: Props) {
    this._states = Object.create(null)
    this._props = Object.assign({}, defaults, options)
    this._states.$wrap = wrapper
    render.call(this)
    value2Colors.call(this, this._props.value, true)
  }

  setValue(value: Colors | null) { }

  getValue(): string {
    const { _props: props, _states: states } = this
    const { h, s, v, a } = states
    let color
    switch (props.format) {
      case 'hsl':
        const { h: _h, s: _s, l } = hsv2hsl(h, s, v)
        color = props.alpha ? `hsla(${Math.round(_h)}, ${Math.round(_s * 100)}%, ${Math.round(l * 100)}%, ${a})` : `hsl(${Math.round(_h)}, ${Math.round(_s * 100)}%, ${Math.round(l * 100)}%)`
        break
      case 'hsv':
        color = props.alpha ? `hsva(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(v * 100)}%, ${a})` : `hsv(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(v * 100)}%)`
        break
      case 'hex':
        break
      case 'rgb':
      default:
        const { r, g, b } = hsv2rgb(h, s, v)
        color = props.alpha ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`
    }
    return color
  }

  destroy() {
    unbindEvents.call(this)
    this._states.$el.parentNode.removeChild(this._states.$el)
    this._props = null
    this._states = null
  }
}

export default ColorPicker