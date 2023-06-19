import { Injectable, UnauthorizedException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PassportStrategy } from "@nestjs/passport";
import {
	PassportLocalStrategyBeforeValidationEvent,
	PassportLocalStrategyValidationFailedEvent,
	PassportLocalStrategyValidationSuccessEvent,
} from "@open-press/backend-interfaces";
import { UserDocument } from "@open-press/models";
import { Strategy } from "passport-local";
import { AuthService } from "../auth.service";
import { PASSPORT_LOCAL_STRATEGY_EVENTS } from "../constants";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
	constructor(private readonly _auth_service: AuthService, private readonly _event_emitter: EventEmitter2) {
		super({
			usernameField: "email",
			session: false,
		});
	}

	/**
	 * This function will validate the given username and password.
	 * @param {string} email
	 * @param {string} password
	 * @returns {Promise<UserDocument>}
	 * @throws {UnauthorizedException}
	 */
	async validate(email: string, password: string): Promise<UserDocument> {
		this._event_emitter.emit(PASSPORT_LOCAL_STRATEGY_EVENTS.before_validation, {
			email,
			password,
		} as PassportLocalStrategyBeforeValidationEvent);

		const user = await this._auth_service.validate(email, password);
		if (!user) {
			this._event_emitter.emit(PASSPORT_LOCAL_STRATEGY_EVENTS.validation_failed, {
				email,
				password,
			} as PassportLocalStrategyValidationFailedEvent);

			throw new UnauthorizedException({
				error: "Email or password do not match",
			});
		}

		this._event_emitter.emit(PASSPORT_LOCAL_STRATEGY_EVENTS.validation_success, {
			user,
		} as PassportLocalStrategyValidationSuccessEvent);

		return user;
	}
}
