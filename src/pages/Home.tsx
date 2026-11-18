import { useState } from 'react'

import {
  BiometricAuth,
  AndroidBiometryStrength,
  BiometryError,
  BiometryErrorType,
} from '@aparajita/capacitor-biometric-auth'

import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'

import {
  cameraOutline,
  pricetagOutline,
  phonePortraitOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
} from 'ionicons/icons'

import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerTypeHint,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
} from '@capacitor/barcode-scanner'

import './Home.css'


interface Promotion {
  idPromocion: string
  producto: string
  descripcion: string
  descuento: string
  precioAnterior: number
  precioOferta: number
  fechaCaducidad: string
  estado: string
  imagen: string
}


const Home: React.FC = () => {

  const [promotion, setPromotion] =
    useState<Promotion | null>(null)

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const [decisionMessage, setDecisionMessage] =
    useState('')

  const [promotionAccepted, setPromotionAccepted] =
    useState(false)


  /*
   * CONSULTAR PROMOCIÓN EN EL BACKEND
   */
  const getPromotion = async (codigo: string) => {

    try {

      setLoading(true)

      setError('')

      setDecisionMessage('')

      setPromotionAccepted(false)

      setPromotion(null)


      const response = await fetch(
        `https://capcatalog-backend.onrender.com/api/mobile/promociones/${encodeURIComponent(codigo)}`
      )


      if (!response.ok) {

        throw new Error(
          'Promoción no encontrada'
        )

      }


      const data: Promotion =
        await response.json()


      setPromotion(data)


    } catch (error) {

      console.error(
        'Error al consultar la promoción:',
        error
      )


      setError(
        'No se pudo consultar la promoción escaneada.'
      )


    } finally {

      setLoading(false)

    }

  }


  /*
   * ESCANEAR CÓDIGO QR
   */
  const scanPromotion = async () => {

    try {

      const result =
        await CapacitorBarcodeScanner.scanBarcode({

          hint:
            CapacitorBarcodeScannerTypeHint.QR_CODE,

          scanInstructions:
            'Escanea el código QR de Cap Catalog',

          scanButton: false,

          cameraDirection:
            CapacitorBarcodeScannerCameraDirection.BACK,

          scanOrientation:
            CapacitorBarcodeScannerScanOrientation.PORTRAIT,

        })


      const codigo =
        result.ScanResult?.trim()


      if (!codigo) {

        alert(
          'No se detectó ningún código QR.'
        )

        return

      }


      console.log(
        'Código QR leído:',
        codigo
      )


      await getPromotion(codigo)


    } catch (error) {

      console.error(
        'Error al escanear el código QR:',
        error
      )


      alert(
        'No se pudo abrir el lector QR.'
      )

    }

  }


  /*
   * ACEPTAR PROMOCIÓN
   * REQUIERE AUTENTICACIÓN BIOMÉTRICA
   */
  const acceptPromotion = async () => {

    if (!promotion) {
      return
    }

    setPromotionAccepted(false)

    setDecisionMessage('')


    try {

      const biometry =
        await BiometricAuth.checkBiometry()


      if (!biometry.isAvailable) {

        setDecisionMessage(
          'No se puede aceptar la promoción porque la biometría no está disponible.'
        )

        return

      }

      await BiometricAuth.authenticate({

        reason:
          'Confirma tu identidad para aceptar la promoción',

        cancelTitle:
          'Cancelar',

        allowDeviceCredential:
          false,

        androidTitle:
          'Confirmar promoción',

        androidSubtitle:
          'Usa tu huella digital para continuar',

        androidConfirmationRequired:
          false,

        androidBiometryStrength:
          AndroidBiometryStrength.weak,

      })


      /*
       * SOLO se ejecuta si la
       * autenticación fue correcta.
       */
      setPromotionAccepted(true)


      setDecisionMessage(
        `Promoción ${promotion.idPromocion} aceptada correctamente mediante autenticación biométrica.`
      )


      console.log(
        'Promoción autorizada mediante biometría:',
        promotion.idPromocion
      )


    } catch (error) {

      /*
       * Si existe cualquier problema,
       * la promoción permanece NO aceptada.
       */
      setPromotionAccepted(false)


      console.error(
        'Error de autenticación biométrica:',
        error
      )


      /*
       * Manejo de errores propios
       * del sistema biométrico.
       */
      if (error instanceof BiometryError) {


        /*
         * Usuario canceló
         * manualmente la autenticación.
         */
        if (
          error.code ===
          BiometryErrorType.userCancel
        ) {

          setDecisionMessage(
            'La autenticación fue cancelada. La promoción no fue aceptada.'
          )

          return

        }


        /*
         * La autenticación biométrica
         * no fue válida.
         */
        if (
          error.code ===
          BiometryErrorType.authenticationFailed
        ) {

          setDecisionMessage(
            'La autenticación biométrica falló. La promoción no fue aceptada.'
          )

          return

        }


        /*
         * El sistema bloqueó temporalmente
         * la biometría después de varios intentos.
         */
        if (
          error.code ===
          BiometryErrorType.biometryLockout
        ) {

          setDecisionMessage(
            'La biometría fue bloqueada temporalmente. La promoción no fue aceptada.'
          )

          return

        }

      }


      /*
       * Error genérico
       */
      setDecisionMessage(
        'No fue posible validar tu identidad. La promoción no fue aceptada.'
      )

    }

  }


  /*
   * RECHAZAR PROMOCIÓN
   */
  const rejectPromotion = () => {

    if (!promotion) {
      return
    }


    /*
     * Si el usuario rechaza,
     * la promoción nunca debe
     * quedar marcada como aceptada.
     */
    setPromotionAccepted(false)


    setDecisionMessage(
      `Has rechazado la promoción ${promotion.idPromocion}.`
    )


    console.log(
      'Promoción rechazada:',
      promotion.idPromocion
    )

  }


  return (

    <IonPage>


      {/* ENCABEZADO */}

      <IonHeader>

        <IonToolbar className="main-toolbar">

          <IonTitle>
            Cap Catalog Mobile
          </IonTitle>

        </IonToolbar>

      </IonHeader>



      <IonContent
        fullscreen
        className="home-content"
      >


        {/* HERO */}

        <section className="hero-mobile">


          <div className="logo-mobile">
            🧢
          </div>


          <IonChip className="project-chip">

            <IonIcon
              icon={phonePortraitOutline}
            />

            <IonLabel>
              Aplicación móvil
            </IonLabel>

          </IonChip>


          <h1>
            Descubre promociones desde tu celular
          </h1>


          <p>
            Escanea códigos QR publicados en Cap Catalog
            y consulta todos los detalles de una promoción.
          </p>


        </section>



        {/* TARJETA PRINCIPAL */}

        <section className="promotion-section">


          <IonCard className="promotion-card">


            <IonCardHeader>


              <div className="card-icon">

                <IonIcon
                  icon={pricetagOutline}
                />

              </div>


              <IonCardTitle>
                Promociones Cap Catalog
              </IonCardTitle>


            </IonCardHeader>



            <IonCardContent>


              <p>
                Utiliza la cámara de tu dispositivo para
                escanear el código QR de una promoción
                disponible en nuestro sitio web.
              </p>


              <IonButton
                expand="block"
                className="scan-button"
                onClick={scanPromotion}
              >

                <IonIcon
                  icon={cameraOutline}
                  slot="start"
                />

                Escanear promoción

              </IonButton>


            </IonCardContent>


          </IonCard>


        </section>



        {/* ESTADO DE CARGA */}

        {loading && (

          <section className="promotion-result">

            <div className="loading-promotion">

              Consultando promoción...

            </div>

          </section>

        )}



        {/* ERROR DE CONSULTA */}

        {error && (

          <section className="promotion-result">

            <div className="promotion-error">

              {error}

            </div>

          </section>

        )}



        {/* DETALLE DE LA PROMOCIÓN */}

        {promotion && (

          <section className="promotion-result">


            <IonCard className="promotion-detail-card">


              <IonCardHeader>


                <div className="promotion-status">

                  <IonIcon
                    icon={checkmarkCircleOutline}
                  />

                  {promotion.estado}

                </div>


                <IonCardTitle>

                  {promotion.producto}

                </IonCardTitle>


              </IonCardHeader>



              <IonCardContent>


                {/* DESCRIPCIÓN */}

                <p className="promotion-description">

                  {promotion.descripcion}

                </p>



                {/* DESCUENTO */}

                <div className="promotion-discount">

                  {promotion.descuento}

                </div>



                {/* PRECIO ANTERIOR */}

                <div className="promotion-price-old">

                  Antes:{' '}

                  <del>

                    ${promotion.precioAnterior}

                  </del>

                </div>



                {/* PRECIO DE OFERTA */}

                <div className="promotion-price-new">

                  Ahora:{' '}

                  <strong>

                    ${promotion.precioOferta} MXN

                  </strong>

                </div>



                {/* FECHA */}

                <div className="promotion-date">

                  <strong>
                    Caduca:{' '}
                  </strong>

                  {promotion.fechaCaducidad}

                </div>



                {/* IDENTIFICADOR */}

                <div className="promotion-id">

                  Código:{' '}

                  {promotion.idPromocion}

                </div>



                {/* BOTONES */}

                <div className="promotion-actions">


                  <IonButton
                    expand="block"
                    color="success"
                    onClick={acceptPromotion}
                  >

                    <IonIcon
                      icon={checkmarkCircleOutline}
                      slot="start"
                    />

                    Aceptar promoción

                  </IonButton>



                  <IonButton
                    expand="block"
                    color="danger"
                    fill="outline"
                    onClick={rejectPromotion}
                  >

                    <IonIcon
                      icon={closeCircleOutline}
                      slot="start"
                    />

                    Rechazar promoción

                  </IonButton>


                </div>



                {/* MENSAJE DE DECISIÓN */}

                {decisionMessage && (

                  <div className="decision-message">

                    {decisionMessage}

                  </div>

                )}



                {/* PROMOCIÓN AUTORIZADA */}

                {promotionAccepted && (

                  <div className="promotion-accepted-message">

                    ✓ Promoción autorizada mediante biometría

                  </div>

                )}


              </IonCardContent>


            </IonCard>


          </section>

        )}



        {/* INFORMACIÓN DE FUNCIONAMIENTO */}

        <section className="integration-info">


          <h2>
            ¿Cómo funciona?
          </h2>


          <div className="steps-container">



            {/* PASO 1 */}

            <div className="step-card">


              <span>
                1
              </span>


              <div>


                <strong>
                  Encuentra una promoción
                </strong>


                <p>
                  Consulta una promoción disponible
                  en Cap Catalog Web.
                </p>


              </div>


            </div>



            {/* PASO 2 */}

            <div className="step-card">


              <span>
                2
              </span>


              <div>


                <strong>
                  Escanea el código QR
                </strong>


                <p>
                  Utiliza la cámara de tu celular
                  para identificar la promoción.
                </p>


              </div>


            </div>



            {/* PASO 3 */}

            <div className="step-card">


              <span>
                3
              </span>


              <div>


                <strong>
                  Consulta los detalles
                </strong>


                <p>
                  Visualiza producto, descuento,
                  precio y fecha de caducidad.
                </p>


              </div>


            </div>


          </div>


        </section>


      </IonContent>


    </IonPage>

  )

}


export default Home