import { Ascii } from '../ascii'
import { ElasticBuffer } from '../elastic-buffer'
import { ITimeFormatter } from '../time-formatter'

export class TimeFormatter implements ITimeFormatter {
  constructor (public readonly buffer: ElasticBuffer, public readonly adjustLocal: boolean = false) {
  }

  public writeLocalDate (v: Date): void {
    const buffer = this.buffer
    buffer.writeWholeNumber(v.getFullYear())
    buffer.writePaddedTensUnits(v.getMonth() + 1)
    buffer.writePaddedTensUnits(v.getDate())
  }

  public writeUtcDate (v: Date): void {
    const buffer = this.buffer
    buffer.writeWholeNumber(v.getUTCFullYear())
    buffer.writePaddedTensUnits(v.getUTCMonth() + 1)
    buffer.writePaddedTensUnits(v.getUTCDate())
  }

  public writeUtcTimestamp (v: Date): void {
    this.writeUtcDate(v)
    this.buffer.writeChar(Ascii.Hyphen)
    this.writeUtcTime(v as Date)
  }

  public writeLocalTimestamp (v: Date): void {
    this.writeLocalDate(v)
    this.buffer.writeChar(Ascii.Hyphen)
    this.writeLocalTime(v as Date)
  }

  public writeUtcTime (v: Date): void {
    const buffer = this.buffer
    buffer.writePaddedTensUnits(v.getUTCHours())
    buffer.writeChar(Ascii.Colon)
    buffer.writePaddedTensUnits(v.getUTCMinutes())
    buffer.writeChar(Ascii.Colon)
    buffer.writePaddedTensUnits(v.getUTCSeconds())
    const ms: number = v.getUTCMilliseconds()
    buffer.writeChar(Ascii.Dot)
    buffer.writePaddedHundreds(ms)
  }

  public writeLocalTime (v: Date): void {
    const buffer = this.buffer
    buffer.writePaddedTensUnits(v.getHours())
    buffer.writeChar(Ascii.Colon)
    buffer.writePaddedTensUnits(v.getMinutes())
    buffer.writeChar(Ascii.Colon)
    buffer.writePaddedTensUnits(v.getSeconds())
    const ms: number = v.getMilliseconds()
    buffer.writeChar(Ascii.Dot)
    buffer.writePaddedHundreds(ms)
  }

  public getLocalTime (start: number): Date {
    return this.getTime(start, false)
  }

  public getUtcTime (start: number): Date {
    return this.getTime(start, true)
  }

  public getUtcDate (start: number): Date {
    return this.getDate(start, true)
  }

  public getLocalDate (start: number): Date {
    return this.getDate(start, false)
  }

  public getUtcTimestamp (start: number, end: number): Date {
    return this.getTimestamp(start, end,true)
  }

  public getLocalTimestamp (start: number, end: number): Date {
    return this.getTimestamp(start, end,false)
  }

  private getTimestamp (start: number, end: number, useUtc: boolean): Date {
    const buffer = this.buffer
    const n: number = buffer.getWholeNumber(start, start + 7)
    if (n == null) {
      return null
    }
    const monthDay: number = n % 10000
    const month: number = Math.round(monthDay / 100)
    const day: number = monthDay % 100
    const year: number = Math.round(n / 10000)
    const len = end - start
    if (len === 8) {
      let t: Date
      if (useUtc) {
        t = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      } else {
        t = new Date(year, month - 1, day, 0, 0, 0, 0)
      }
      if (this.adjustLocal) {
        t = new Date(t.getTime() - t.getTimezoneOffset() * -60000)
      }
      return t
    }

    let offset: number = 8
    if (buffer.get(start + offset) !== Ascii.Hyphen) {
      return null
    }

    if (len < 17) {
      return null
    }

    offset += 1
    const hh: number = buffer.getWholeNumber(start + offset, start + offset + 1)
    offset += 2
    if (buffer.get(start + offset) !== Ascii.Colon) {
      return null
    }
    offset += 1
    const mm: number = buffer.getWholeNumber(start + offset, start + offset + 1)
    offset += 2
    if (buffer.get(start + offset) !== Ascii.Colon) {
      return null
    }
    offset += 1
    const ss: number = buffer.getWholeNumber(start + offset, start + offset + 1)
    offset += 2
    let ms: number = 0
    if (buffer.get(start + offset) === Ascii.Dot) {
      offset += 1
      ms = buffer.getWholeNumber(start + offset, start + offset + 2)
    }
    let t: Date
    if (useUtc) {
      t = new Date(Date.UTC(year, month - 1, day, hh, mm, ss, ms))
    } else {
      t = new Date(year, month - 1, day, hh, mm, ss, ms)
      if (this.adjustLocal) {
        t = new Date(t.getTime() - t.getTimezoneOffset() * -60000)
      }
    }
    return t
  }

  private getTime (start: number, useUtc: boolean): Date {
    const buffer = this.buffer
    let offset = 0
    const hh: number = buffer.getWholeNumber(start + offset, start + offset + 1)
    offset += 2
    if (buffer.get(start + offset) !== Ascii.Colon) {
      return null
    }
    offset += 1
    const mm: number = buffer.getWholeNumber(start + offset, start + offset + 1)
    offset += 2
    if (buffer.get(start + offset) !== Ascii.Colon) {
      return null
    }
    offset += 1
    const ss: number = buffer.getWholeNumber(start + offset, start + offset + 1)
    offset += 2
    let ms: number = 0
    if (buffer.get(start + offset) === Ascii.Dot) {
      offset += 1
      ms = buffer.getWholeNumber(start + offset, start + offset + 2)
    }
    let t: Date
    if (useUtc) {
      t = new Date(Date.UTC(0, 0, 0, hh, mm, ss, ms))
    } else {
      t = new Date(0, 0, 0, hh, mm, ss, ms)
      if (this.adjustLocal) {
        t = new Date(t.getTime() - t.getTimezoneOffset() * -60000)
      }
    }
    return t
  }

  private getDate (start: number, useUtc: boolean): Date {

    // = 20150417

    const n: number = this.buffer.getWholeNumber(start, start + 7)
    if (n == null) {
      return null
    }
    const monthDay: number = n % 10000
    const month: number = Math.round(monthDay / 100)
    const day: number = monthDay % 100
    const year: number = Math.round(n / 10000)
    let t: Date
    if (useUtc) {
      t = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    } else {
      t = new Date(year, month - 1, day, 0, 0, 0, 0)
      console.log(`getDate offset = ${t.getTimezoneOffset()}`)
      if (this.adjustLocal) {
        t = new Date(t.getTime() - t.getTimezoneOffset() * -60000)
      }
    }
    return t
  }
}
