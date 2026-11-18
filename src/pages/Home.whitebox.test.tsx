import React from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'


/*
 * MOCK DEL ESCÁNER QR
 */
vi.mock('@capacitor/barcode-scanner', () => ({
  CapacitorBarcodeScanner: {
    scanBarcode: vi.fn(),
  },

  CapacitorBarcodeScannerTypeHint: {
    QR_CODE: 'QR_CODE',
  },

  CapacitorBarcodeScannerCameraDirection: {
    BACK: 'BACK',
  },

  CapacitorBarcodeScannerScanOrientation: {
    PORTRAIT: 'PORTRAIT',
  },
}))


/*
 * MOCK DE BIOMETRÍA
 */
vi.mock('@aparajita/capacitor-biometric-auth', () => {

  class MockBiometryError extends Error {

    code: string

    constructor(code: string) {
      super(code)
      this.code = code
    }
  }

  return {

    BiometricAuth: {
      checkBiometry: vi.fn(),
      authenticate: vi.fn(),
    },

    AndroidBiometryStrength: {
      weak: 'weak',
    },

    BiometryError: MockBiometryError,

    BiometryErrorType: {
      userCancel: 'userCancel',
      authenticationFailed: 'authenticationFailed',
      biometryLockout: 'biometryLockout',
    },
  }
})


import Home from './Home'

import {
  CapacitorBarcodeScanner,
} from '@capacitor/barcode-scanner'

import {
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
} from '@aparajita/capacitor-biometric-auth'


const promotion = {

  idPromocion: 'PROMO-001',

  producto: 'New York Roja New Era',

  descripcion:
    'Gorra roja New Era con logo de New York, estilo urbano y visera plana.',

  descuento: '15% OFF',

  precioAnterior: 550,

  precioOferta: 468,

  fechaCaducidad: '2026-10-15',

  estado: 'CADUCADA',

  imagen:
    '/images/products/new york roja new era.png',
}


/*
 * MOCK DE FETCH
 */
const fetchMock = vi.fn()

vi.stubGlobal(
  'fetch',
  fetchMock
)


/*
 * FUNCIÓN AUXILIAR
 *
 * Simula:
 * QR
 * ↓
 * Backend
 * ↓
 * Detalle de promoción
 */
const cargarPromocion = async () => {

  vi.mocked(
    CapacitorBarcodeScanner.scanBarcode
  ).mockResolvedValue({

    ScanResult: 'PROMO-001',

  } as any)


  fetchMock.mockResolvedValue({

    ok: true,

    json: async () =>
      promotion,

  } as Response)


  render(
    <Home />
  )


  fireEvent.click(
    screen.getByText(
      /Escanear promoción/i
    )
  )


  await screen.findByText(
    'New York Roja New Era'
  )
}


describe(
  'White Box - acceptPromotion()',
  () => {

    beforeEach(() => {

      vi.clearAllMocks()

      fetchMock.mockReset()

    })


    afterEach(() => {

      cleanup()

    })


    /*
     * P1
     *
     * Sin promoción no existe
     * posibilidad de aceptar.
     */
    it(
      'no muestra el botón aceptar cuando no existe promoción',
      () => {

        render(
          <Home />
        )

        expect(
          screen.queryByText(
            /Aceptar promoción/i
          )
        ).toBeNull()
      }
    )


    /*
     * P2
     *
     * Promoción cargada
     * pero biometría no disponible.
     */
    it(
      'rechaza la aceptación cuando la biometría no está disponible',
      async () => {

        vi.mocked(
          BiometricAuth.checkBiometry
        ).mockResolvedValue({

          isAvailable: false,

        } as any)


        await cargarPromocion()


        fireEvent.click(
          screen.getByText(
            /Aceptar promoción/i
          )
        )


        await screen.findByText(
          'No se puede aceptar la promoción porque la biometría no está disponible.'
        )


        expect(
          BiometricAuth.authenticate
        ).not.toHaveBeenCalled()
      }
    )


    /*
     * P3
     *
     * Biometría disponible
     * y autenticación correcta.
     */
    it(
      'acepta la promoción cuando la autenticación biométrica es correcta',
      async () => {

        vi.mocked(
          BiometricAuth.checkBiometry
        ).mockResolvedValue({

          isAvailable: true,

        } as any)


        vi.mocked(
          BiometricAuth.authenticate
        ).mockResolvedValue(
          undefined
        )


        await cargarPromocion()


        fireEvent.click(
          screen.getByText(
            /Aceptar promoción/i
          )
        )


        await screen.findByText(
          /Promoción PROMO-001 aceptada correctamente mediante autenticación biométrica/i
        )


        expect(
          screen.getByText(
            /Promoción autorizada mediante biometría/i
          )
        ).toBeTruthy()
      }
    )


    /*
     * P4
     *
     * Usuario cancela biometría.
     */
    it(
      'no acepta la promoción cuando el usuario cancela la autenticación',
      async () => {

        vi.mocked(
          BiometricAuth.checkBiometry
        ).mockResolvedValue({

          isAvailable: true,

        } as any)


        const error =
          new (BiometryError as any)(
            BiometryErrorType.userCancel
          )


        vi.mocked(
          BiometricAuth.authenticate
        ).mockRejectedValue(
          error
        )


        await cargarPromocion()


        fireEvent.click(
          screen.getByText(
            /Aceptar promoción/i
          )
        )


        await screen.findByText(
          'La autenticación fue cancelada. La promoción no fue aceptada.'
        )
      }
    )


    /*
     * P5
     *
     * Autenticación biométrica fallida.
     */
    it(
      'no acepta la promoción cuando la autenticación biométrica falla',
      async () => {

        vi.mocked(
          BiometricAuth.checkBiometry
        ).mockResolvedValue({

          isAvailable: true,

        } as any)


        const error =
          new (BiometryError as any)(
            BiometryErrorType.authenticationFailed
          )


        vi.mocked(
          BiometricAuth.authenticate
        ).mockRejectedValue(
          error
        )


        await cargarPromocion()


        fireEvent.click(
          screen.getByText(
            /Aceptar promoción/i
          )
        )


        await screen.findByText(
          'La autenticación biométrica falló. La promoción no fue aceptada.'
        )
      }
    )


    /*
     * P6
     *
     * Biometría bloqueada.
     */
    it(
      'no acepta la promoción cuando la biometría está bloqueada',
      async () => {

        vi.mocked(
          BiometricAuth.checkBiometry
        ).mockResolvedValue({

          isAvailable: true,

        } as any)


        const error =
          new (BiometryError as any)(
            BiometryErrorType.biometryLockout
          )


        vi.mocked(
          BiometricAuth.authenticate
        ).mockRejectedValue(
          error
        )


        await cargarPromocion()


        fireEvent.click(
          screen.getByText(
            /Aceptar promoción/i
          )
        )


        await screen.findByText(
          'La biometría fue bloqueada temporalmente. La promoción no fue aceptada.'
        )
      }
    )


    /*
     * P7
     *
     * Excepción inesperada.
     */
    it(
      'maneja correctamente un error biométrico inesperado',
      async () => {

        vi.mocked(
          BiometricAuth.checkBiometry
        ).mockResolvedValue({

          isAvailable: true,

        } as any)


        vi.mocked(
          BiometricAuth.authenticate
        ).mockRejectedValue(
          new Error(
            'Error inesperado'
          )
        )


        await cargarPromocion()


        fireEvent.click(
          screen.getByText(
            /Aceptar promoción/i
          )
        )


        await screen.findByText(
          'No fue posible validar tu identidad. La promoción no fue aceptada.'
        )
      }
    )

  }
)

describe(
  'White Box - scanPromotion()',
  () => {

    beforeEach(() => {

      vi.clearAllMocks()

      fetchMock.mockReset()

      vi.stubGlobal(
        'alert',
        vi.fn()
      )
    })


    afterEach(() => {

      cleanup()

    })


    /*
     * SP-01
     *
     * Código QR válido.
     */
    it(
      'consulta la promoción cuando el QR contiene un código válido',
      async () => {

        vi.mocked(
          CapacitorBarcodeScanner.scanBarcode
        ).mockResolvedValue({

          ScanResult: 'PROMO-001',

        } as any)


        fetchMock.mockResolvedValue({

          ok: true,

          json: async () =>
            promotion,

        } as Response)


        render(
          <Home />
        )


        fireEvent.click(
          screen.getByText(
            /Escanear promoción/i
          )
        )


        await screen.findByText(
          'New York Roja New Era'
        )


        expect(
          fetchMock
        ).toHaveBeenCalledTimes(1)


        expect(
          fetchMock
        ).toHaveBeenCalledWith(
          expect.stringContaining(
            'PROMO-001'
          )
        )
      }
    )


    /*
     * SP-02
     *
     * Código vacío.
     *
     * También comprueba trim():
     * "   " pasa a "".
     */
    it(
      'no consulta el backend cuando el QR está vacío',
      async () => {

        vi.mocked(
          CapacitorBarcodeScanner.scanBarcode
        ).mockResolvedValue({

          ScanResult: '   ',

        } as any)


        render(
          <Home />
        )


        fireEvent.click(
          screen.getByText(
            /Escanear promoción/i
          )
        )


        await waitFor(() => {

          expect(
            globalThis.alert
          ).toHaveBeenCalledWith(
            'No se detectó ningún código QR.'
          )
        })


        expect(
          fetchMock
        ).not.toHaveBeenCalled()
      }
    )


    /*
     * SP-03
     *
     * Excepción del lector QR.
     */
    it(
      'maneja correctamente una excepción al abrir el escáner',
      async () => {

        vi.mocked(
          CapacitorBarcodeScanner.scanBarcode
        ).mockRejectedValue(
          new Error(
            'Cámara no disponible'
          )
        )


        render(
          <Home />
        )


        fireEvent.click(
          screen.getByText(
            /Escanear promoción/i
          )
        )


        await waitFor(() => {

          expect(
            globalThis.alert
          ).toHaveBeenCalledWith(
            'No se pudo abrir el lector QR.'
          )
        })


        expect(
          fetchMock
        ).not.toHaveBeenCalled()
      }
    )

  }
)

describe(
  'White Box - getPromotion()',
  () => {

    beforeEach(() => {

      vi.clearAllMocks()

      fetchMock.mockReset()

    })


    afterEach(() => {

      cleanup()

    })


    /*
     * GP-01
     *
     * El servidor responde correctamente.
     */
    it(
      'recibe y muestra correctamente una promoción del backend',
      async () => {

        vi.mocked(
          CapacitorBarcodeScanner.scanBarcode
        ).mockResolvedValue({

          ScanResult: 'PROMO-001',

        } as any)


        fetchMock.mockResolvedValue({

          ok: true,

          json: async () =>
            promotion,

        } as Response)


        render(
          <Home />
        )


        fireEvent.click(
          screen.getByText(
            /Escanear promoción/i
          )
        )


        await screen.findByText(
          'New York Roja New Era'
        )


        expect(
          fetchMock
        ).toHaveBeenCalledTimes(1)


        expect(
          screen.getByText(
            '15% OFF'
          )
        ).toBeTruthy()
      }
    )


    /*
     * GP-02
     *
     * El servidor responde,
     * pero response.ok = false.
     */
    it(
      'muestra un error cuando el backend responde con un estado HTTP incorrecto',
      async () => {

        vi.mocked(
          CapacitorBarcodeScanner.scanBarcode
        ).mockResolvedValue({

          ScanResult: 'PROMO-INEXISTENTE',

        } as any)


        fetchMock.mockResolvedValue({

          ok: false,

          status: 404,

        } as Response)


        render(
          <Home />
        )


        fireEvent.click(
          screen.getByText(
            /Escanear promoción/i
          )
        )


        await screen.findByText(
          'No se pudo consultar la promoción escaneada.'
        )


        expect(
          fetchMock
        ).toHaveBeenCalledTimes(1)


        expect(
          screen.queryByText(
            'New York Roja New Era'
          )
        ).toBeNull()
      }
    )


    /*
     * GP-03
     *
     * El servidor no puede ser alcanzado.
     */
    it(
      'maneja correctamente una falla de conexión con el backend',
      async () => {

        vi.mocked(
          CapacitorBarcodeScanner.scanBarcode
        ).mockResolvedValue({

          ScanResult: 'PROMO-001',

        } as any)


        fetchMock.mockRejectedValue(
          new Error(
            'Sin conexión'
          )
        )


        render(
          <Home />
        )


        fireEvent.click(
          screen.getByText(
            /Escanear promoción/i
          )
        )


        await screen.findByText(
          'No se pudo consultar la promoción escaneada.'
        )


        expect(
          screen.queryByText(
            'New York Roja New Era'
          )
        ).toBeNull()
      }
    )

  }
)

describe(
  'Automatización - valor fuera de rango',
  () => {

    beforeEach(() => {
      vi.clearAllMocks()
      fetchMock.mockReset()
    })

    afterEach(() => {
      cleanup()
    })

    it(
      'maneja un código QR excesivamente largo sin romper la aplicación',
      async () => {

        const codigoMuyLargo =
          'A'.repeat(5000)

        vi.mocked(
          CapacitorBarcodeScanner.scanBarcode
        ).mockResolvedValue({
          ScanResult: codigoMuyLargo,
        } as any)

        fetchMock.mockResolvedValue({
          ok: false,
          status: 404,
        } as Response)

        render(
          <Home />
        )

        fireEvent.click(
          screen.getByText(
            /Escanear promoción/i
          )
        )

        await screen.findByText(
          'No se pudo consultar la promoción escaneada.'
        )

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(1)
      }
    )

  }
)