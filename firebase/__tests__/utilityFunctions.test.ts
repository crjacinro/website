import 'jest-fetch-mock'
import { Review, TCourseId, TNullableNumber, TSemesterId } from '@globals/types'
import {
	parseReviewId,
	TAveragesData,
	updateAverage,
	updateAverages,
} from '../utilityFunctions'

const computeAverage = (dataArray: TNullableNumber[]) =>
	dataArray
		.map((x) => x ?? 0)
		.filter((x) => x !== 0) // omit nulls
		.reduce((sum, x) => sum + x, 0) / dataArray.length

const mapReviewsDataToAverages = (reviewsData: Review[]) => ({
	avgWorkload: computeAverage(reviewsData.map(({ workload }) => workload)),
	avgDifficulty: computeAverage(
		reviewsData.map(({ difficulty }) => difficulty)
	),
	avgOverall: computeAverage(reviewsData.map(({ overall }) => overall)),
	// TODO: implement additional logic for `avgStaffSupport` in test harness
	// avgStaffSupport: computeAverage(
	// 	reviewsData.map(({ staffSupport }) => staffSupport)
	// ),
})

describe('firebase utility functions tests', () => {
	describe('parseReviewId() tests', () => {
		it('parses simple courseId', () => {
			const reviewId = 'CS-1234-2100-3-1234567890'
			const parsedData = parseReviewId(reviewId)
			expect(parsedData).toStrictEqual({
				courseId: 'CS-1234',
				year: '2100',
				semesterTerm: '3',
			})
		})

		it('parses compound courseId', () => {
			const reviewId = 'CS-1234-O99-2100-3-1234567890'
			const parsedData = parseReviewId(reviewId)
			expect(parsedData).toStrictEqual({
				courseId: 'CS-1234-O99',
				year: '2100',
				semesterTerm: '3',
			})
		})
	})

	describe('updateAverage() tests', () => {
		let oldData: number[]
		let oldCount: number
		let oldAverage: number

		beforeEach(() => {
			oldData = [1, 2, 3, 4, 5]
			oldCount = oldData.length
			oldAverage = computeAverage(oldData)
		})

		it('returns null for `newCount` of 0', () => {
			const data: TAveragesData = {
				newCount: 0,
			}
			expect(updateAverage(data)).toBeNull()
		})

		it('updates average for added value', () => {
			const newValue = 6
			const newCount = oldCount + 1
			const addedData: TAveragesData = {
				oldAverage,
				oldCount,
				newCount,
				newValue,
			}
			const newData = [...oldData, newValue]
			expect(updateAverage(addedData)).toEqual(computeAverage(newData))
		})

		it('updates average for edited value', () => {
			const oldValue = 5
			const newValue = 6
			const newCount = oldCount
			const editedData: TAveragesData = {
				oldAverage,
				oldCount,
				newCount,
				oldValue,
				newValue,
			}
			const newData = [
				...oldData.filter((x: number) => x !== oldValue),
				newValue,
			]
			expect(updateAverage(editedData)).toEqual(computeAverage(newData))
		})

		it('updates average for deleted value', () => {
			const oldValue = 5
			const newCount = oldCount - 1
			const deletedData: TAveragesData = {
				oldAverage,
				oldCount,
				newCount,
				oldValue,
			}
			const newData = oldData.filter((x: number) => x !== oldValue)
			expect(updateAverage(deletedData)).toEqual(computeAverage(newData))
		})
	})

	describe('updateAverages() tests', () => {
		const courseId: TCourseId = 'CS-6465'
		const year = 2100
		const semesterId: TSemesterId = 'sp'
		const semesterTerm = 1
		const baseReviewId = `${courseId}-${year}-${semesterTerm}-`
		const baseDummyReviewData = {
			courseId,
			year,
			semesterId,
			isLegacy: false,
			reviewerId: 'xyz',
			isGTVerifiedReviewer: false,
			created: 1234567890,
			modified: null,
			body: '',
			upvotes: 0,
			downvotes: 0,
		}
		let oldReviewsData: Review[]
		let oldCount: number
		let avgWorkload: number
		let avgDifficulty: number
		let avgOverall: number
		// let avgStaffSupport: number // TODO: implement additional logic for `avgStaffSupport` in test harness

		beforeEach(() => {
			oldReviewsData = [
				{
					...baseDummyReviewData,
					reviewId: baseReviewId + '1',
					workload: 10,
					difficulty: 3,
					overall: 3,
					staffSupport: 3,
				},
				{
					...baseDummyReviewData,
					reviewId: baseReviewId + '2',
					workload: 15,
					difficulty: 4,
					overall: 2,
					staffSupport: 3,
				},
				{
					...baseDummyReviewData,
					reviewId: baseReviewId + '3',
					workload: 5,
					difficulty: 1,
					overall: 5,
					staffSupport: 5,
				},
			]

			oldCount = oldReviewsData.length
			;({
				avgWorkload,
				avgDifficulty,
				avgOverall,
				// avgStaffSupport, // TODO: implement additional logic for `avgStaffSupport` in test harness
			} = mapReviewsDataToAverages(oldReviewsData))
		})

		it('returns nulls for `newCount` of 0', () => {
			const newReviewsData: Review[] = []
			const newCount = newReviewsData.length

			const updatedAverages = updateAverages({ courseId, newCount })

			const expectedUpdatedAverages = {
				avgWorkload: null,
				avgDifficulty: null,
				avgOverall: null,
				avgStaffSupport: null,
			}

			expect(updatedAverages).toStrictEqual(expectedUpdatedAverages)
		})

		it('computes updated averages for added review', () => {
			const addReviewData: Review = {
				...baseDummyReviewData,
				reviewId: baseReviewId + '4',
				workload: 7,
				difficulty: 2,
				overall: 4,
				staffSupport: 4,
			}
			const newReviewsData = [...oldReviewsData, addReviewData]

			const newCount = newReviewsData.length

			const updatedAverages = updateAverages({
				courseId,
				oldCount,
				newCount,
				newWorkload: addReviewData.workload,
				newDifficulty: addReviewData.difficulty,
				newOverall: addReviewData.overall,
				newStaffSupport: addReviewData.staffSupport ?? undefined,
				avgWorkload,
				avgDifficulty,
				avgOverall,
				// avgStaffSupport, // TODO: implement additional logic for `avgStaffSupport` in test harness
			})

			const expectedUpdatedAverages = mapReviewsDataToAverages(newReviewsData)
			const {
				avgDifficulty: expectedAvgDifficulty,
				avgWorkload: expectedAvgWorkload,
				avgOverall: expectedAverageOverall,
			} = expectedUpdatedAverages

			expect(updatedAverages).toEqual(
				expect.objectContaining({
					avgDifficulty: expectedAvgDifficulty,
					avgWorkload: expectedAvgWorkload,
					avgOverall: expectedAverageOverall,
				})
			)
		})

		it('computes updated averages for updated review', () => {
			const reviewId = baseReviewId + '3'

			const oldReviewData = oldReviewsData.find(
				(review) => review.reviewId === reviewId
			)

			const updatedReviewData: Review = {
				...baseDummyReviewData,
				reviewId,
				workload: 7,
				difficulty: 2,
				overall: 4,
				staffSupport: 4,
			}
			const newReviewsData = oldReviewsData.map((review) => {
				if (review.reviewId === reviewId) {
					return updatedReviewData
				}
				return review
			})

			const newCount = newReviewsData.length

			const updatedAverages = updateAverages({
				courseId,
				oldCount,
				newCount,
				oldWorkload: oldReviewData?.workload,
				oldDifficulty: oldReviewData?.difficulty,
				oldOverall: oldReviewData?.overall,
				oldStaffSupport: oldReviewData?.staffSupport ?? undefined,
				newWorkload: updatedReviewData.workload,
				newDifficulty: updatedReviewData.difficulty,
				newOverall: updatedReviewData.overall,
				newStaffSupport: updatedReviewData.staffSupport ?? undefined,
				avgWorkload,
				avgDifficulty,
				avgOverall,
				// avgStaffSupport, // TODO: implement additional logic for `avgStaffSupport` in test harness
			})

			const expectedUpdatedAverages = mapReviewsDataToAverages(newReviewsData)
			const {
				avgDifficulty: expectedAvgDifficulty,
				avgWorkload: expectedAvgWorkload,
				avgOverall: expectedAverageOverall,
			} = expectedUpdatedAverages

			expect(updatedAverages).toEqual(
				expect.objectContaining({
					avgDifficulty: expectedAvgDifficulty,
					avgWorkload: expectedAvgWorkload,
					avgOverall: expectedAverageOverall,
				})
			)
		})

		it('computes updated averages for deleted review', () => {
			const reviewId = baseReviewId + '3'

			const oldReviewData = oldReviewsData.find(
				(review) => review.reviewId === reviewId
			)

			const newReviewsData = oldReviewsData.filter(
				(review) => review.reviewId !== reviewId
			)

			const newCount = newReviewsData.length

			const updatedAverages = updateAverages({
				courseId,
				oldCount,
				newCount,
				oldWorkload: oldReviewData?.workload,
				oldDifficulty: oldReviewData?.difficulty,
				oldOverall: oldReviewData?.overall,
				oldStaffSupport: oldReviewData?.staffSupport ?? undefined,
				avgWorkload,
				avgDifficulty,
				avgOverall,
				// avgStaffSupport, // TODO: implement additional logic for `avgStaffSupport` in test harness
			})

			const expectedUpdatedAverages = mapReviewsDataToAverages(newReviewsData)
			const {
				avgDifficulty: expectedAvgDifficulty,
				avgWorkload: expectedAvgWorkload,
				avgOverall: expectedAverageOverall,
			} = expectedUpdatedAverages

			expect(updatedAverages).toEqual(
				expect.objectContaining({
					avgDifficulty: expectedAvgDifficulty,
					avgWorkload: expectedAvgWorkload,
					avgOverall: expectedAverageOverall,
				})
			)
		})
	})
})
